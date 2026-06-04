import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { SubmissionStatus } from '@modules/competitions/enums/competition.enums';
import { TestCaseResultStatus } from '@modules/courses/enums/course.enums';
import type { ResourceLimits } from '../schemas/assignment.schema';
import {
  getPipeline,
  resolveLanguage,
  wrapCodeForLanguage,
} from './language-pipeline';

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timeMs: number;
  memoryKb: number;
  verdict: SubmissionStatus;
  testStatus: TestCaseResultStatus;
}

function formatExecutionOutput(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}

@Injectable()
export class DockerExecutorService {
  private readonly logger = new Logger(DockerExecutorService.name);
  private activeRuns = 0;

  constructor(private readonly config: ConfigService) {}

  isEnabled(): boolean {
    return this.config.get<boolean>('executor.enabled', false);
  }

  private maxConcurrent(): number {
    return this.config.get<number>('executor.maxConcurrent', 4);
  }

  private dockerAvailable(): boolean {
    const result = spawnSync('docker', ['info'], {
      encoding: 'utf8',
      timeout: 5000,
    });
    return result.status === 0;
  }

  runTestCase(input: {
    language: string;
    code: string;
    stdin: string;
    expectedOutput: string;
    limits: ResourceLimits;
    timeLimitMs?: number;
    memoryLimitMb?: number;
  }): Promise<ExecutionResult> {
    if (!this.isEnabled()) {
      return this.runInProcessFallback(input);
    }

    if (!this.dockerAvailable()) {
      this.logger.warn('Docker unavailable; using in-process fallback');
      return this.runInProcessFallback(input);
    }

    if (this.activeRuns >= this.maxConcurrent()) {
      throw new ServiceUnavailableException({
        code: 'EXECUTOR_BUSY',
        message: 'Execution pool at capacity',
      });
    }

    this.activeRuns += 1;
    try {
      return this.runDocker(input);
    } finally {
      this.activeRuns -= 1;
    }
  }

  private runInProcessFallback(input: {
    language: string;
    code: string;
    stdin: string;
    expectedOutput: string;
    timeLimitMs?: number;
  }): ExecutionResult {
    const lang = resolveLanguage(input.language);
    const start = Date.now();
    if (lang !== 'javascript') {
      return {
        stdout: '',
        stderr: 'Language requires Docker executor',
        exitCode: 1,
        timeMs: Date.now() - start,
        memoryKb: 0,
        verdict: SubmissionStatus.RuntimeError,
        testStatus: TestCaseResultStatus.Error,
      };
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call
      const out = new Function(
        'input',
        `${input.code}; return typeof solve === 'function' ? solve(input) : undefined;`,
      )(input.stdin.trim()) as unknown;
      const actual = formatExecutionOutput(out).trim();
      const expected = input.expectedOutput.trim();
      const pass = actual === expected;
      return {
        stdout: actual,
        stderr: '',
        exitCode: pass ? 0 : 1,
        timeMs: Date.now() - start,
        memoryKb: 1024,
        verdict: pass
          ? SubmissionStatus.Accepted
          : SubmissionStatus.WrongAnswer,
        testStatus: pass
          ? TestCaseResultStatus.Pass
          : TestCaseResultStatus.Fail,
      };
    } catch (err) {
      return {
        stdout: '',
        stderr: err instanceof Error ? err.message : 'Runtime error',
        exitCode: 1,
        timeMs: Date.now() - start,
        memoryKb: 0,
        verdict: SubmissionStatus.RuntimeError,
        testStatus: TestCaseResultStatus.Error,
      };
    }
  }

  private runDocker(input: {
    language: string;
    code: string;
    stdin: string;
    expectedOutput: string;
    limits: ResourceLimits;
    timeLimitMs?: number;
    memoryLimitMb?: number;
  }): ExecutionResult {
    const lang = resolveLanguage(input.language);
    if (!lang) {
      return {
        stdout: '',
        stderr: `Unsupported language: ${input.language}`,
        exitCode: 1,
        timeMs: 0,
        memoryKb: 0,
        verdict: SubmissionStatus.CompilationError,
        testStatus: TestCaseResultStatus.Error,
      };
    }

    const pipeline = getPipeline(lang);
    const workHost = join(tmpdir(), `nibras-exec-${randomUUID()}`);
    mkdirSync(workHost, { recursive: true });

    const memMb = input.memoryLimitMb ?? input.limits.memoryMb ?? 256;
    const cpuSec = Math.ceil(
      (input.timeLimitMs ?? input.limits.timeMs ?? 5000) / 1000,
    );
    const source = wrapCodeForLanguage(lang, input.code);
    writeFileSync(join(workHost, pipeline.sourceFile), source, 'utf8');

    const dockerBase = [
      'run',
      '--rm',
      '--network',
      'none',
      '--memory',
      `${memMb}m`,
      '--memory-swap',
      `${memMb}m`,
      '--cpus',
      String(input.limits.cpuCores ?? 1),
      '--pids-limit',
      '64',
      '--read-only',
      '--tmpfs',
      '/tmp:rw,noexec,nosuid,size=50m',
      '-v',
      `${workHost}:${pipeline.workDir}:ro`,
      '-w',
      pipeline.workDir,
      '-i',
      pipeline.image,
    ];

    try {
      if (pipeline.compileCmd) {
        const compile = spawnSync(
          'docker',
          [...dockerBase, 'sh', '-c', pipeline.compileCmd.join(' ')],
          { encoding: 'utf8', timeout: (cpuSec + 5) * 1000 },
        );
        if (compile.status !== 0) {
          return {
            stdout: '',
            stderr: compile.stderr || compile.stdout || 'Compilation failed',
            exitCode: compile.status ?? 1,
            timeMs: 0,
            memoryKb: 0,
            verdict: SubmissionStatus.CompilationError,
            testStatus: TestCaseResultStatus.Error,
          };
        }
      }

      const runStart = Date.now();
      const run = spawnSync(
        'docker',
        [
          ...dockerBase,
          'timeout',
          String(cpuSec),
          'sh',
          '-c',
          `printf '%s' '${input.stdin.replace(/'/g, "'\\''")}' | ${pipeline.runCmd.join(' ')}`,
        ],
        {
          encoding: 'utf8',
          timeout: (cpuSec + 10) * 1000,
          maxBuffer: 2 * 1024 * 1024,
        },
      );
      const timeMs = Date.now() - runStart;

      if (run.error?.message?.includes('timed out') || run.status === 124) {
        return {
          stdout: '',
          stderr: 'Time limit exceeded',
          exitCode: 124,
          timeMs,
          memoryKb: 0,
          verdict: SubmissionStatus.TimeLimitExceeded,
          testStatus: TestCaseResultStatus.TimeLimitExceeded,
        };
      }

      const stdout = (run.stdout ?? '').trim();
      const expected = input.expectedOutput.trim();
      const pass = stdout === expected;

      return {
        stdout,
        stderr: run.stderr ?? '',
        exitCode: run.status ?? 0,
        timeMs,
        memoryKb: memMb * 4,
        verdict: pass
          ? SubmissionStatus.Accepted
          : SubmissionStatus.WrongAnswer,
        testStatus: pass
          ? TestCaseResultStatus.Pass
          : TestCaseResultStatus.Fail,
      };
    } finally {
      try {
        rmSync(workHost, { recursive: true, force: true });
      } catch {
        /* ignore cleanup errors */
      }
    }
  }
}
