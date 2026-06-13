import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DockerExecutorService } from '@modules/assessments/execution/docker-executor.service';
import { ResourceLimits } from '@modules/assessments/schemas/assignment.schema';
import { SubmissionStatus } from '../enums/competition.enums';
import { Problem } from '../schemas/problem.schema';
import { Submission } from '../schemas/submission.schema';

const DEFAULT_LIMITS: ResourceLimits = {
  cpuCores: 1,
  memoryMb: 256,
  timeMs: 5000,
  diskMb: 50,
};

@Injectable()
export class JudgeService {
  constructor(
    @InjectModel(Submission.name)
    private readonly submissionModel: Model<Submission>,
    @InjectModel(Problem.name) private readonly problemModel: Model<Problem>,
    private readonly executor: DockerExecutorService,
  ) {}

  async judgeSubmission(submissionId: string): Promise<SubmissionStatus> {
    const submission = await this.submissionModel.findById(submissionId).exec();
    if (!submission) return SubmissionStatus.RuntimeError;

    const problem = await this.problemModel
      .findById(submission.problemId)
      .exec();
    if (!problem?.testCases?.length) {
      submission.status = SubmissionStatus.Accepted;
      submission.score = 100;
      await submission.save();
      return submission.status;
    }

    const hidden = problem.testCases.filter((t) => !t.isSample);
    const tests = hidden.length > 0 ? hidden : problem.testCases;

    let maxTime = 0;
    let maxMem = 0;
    try {
      for (const tc of tests) {
        const exec = await this.executor.runTestCase({
          language: submission.language ?? 'javascript',
          code: submission.code,
          stdin: tc.input,
          expectedOutput: tc.expectedOutput,
          limits: DEFAULT_LIMITS,
          timeLimitMs: DEFAULT_LIMITS.timeMs,
          memoryLimitMb: DEFAULT_LIMITS.memoryMb,
        });
        maxTime = Math.max(maxTime, exec.timeMs);
        maxMem = Math.max(maxMem, exec.memoryKb);
        if (exec.verdict !== SubmissionStatus.Accepted) {
          submission.status = exec.verdict;
          submission.runtime = maxTime;
          submission.memory = maxMem;
          await submission.save();
          return submission.status;
        }
      }
      submission.status = SubmissionStatus.Accepted;
      submission.score = 100;
      submission.runtime = maxTime || 10;
      submission.memory = maxMem || 1024;
    } catch {
      submission.status = SubmissionStatus.RuntimeError;
    }

    await submission.save();
    return submission.status;
  }
}
