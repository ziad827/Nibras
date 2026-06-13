import fs from 'node:fs';
import path from 'node:path';
import { ProjectManifest } from '@nibras/contracts';

export const CS106L_COURSE = {
  slug: 'cs106l',
  title: 'CS106L — Standard C++ Programming',
  termLabel: 'Self-Paced',
  courseCode: 'CS106L',
} as const;

export const CS106L_RELEASE_VERSION = '2026-04-11-cs106l-v1';
export const CS106L_TEST_COMMAND =
  'cmake -S . -B build && cmake --build build && ctest --test-dir build --output-on-failure';

type Cs106lProjectDefinition = {
  projectKey: string;
  title: string;
  description: string;
  assignmentDir: string;
  starterFileName: string;
  allowedPaths: string[];
  milestoneDescription: string;
};

const CS106L_PROJECTS: readonly Cs106lProjectDefinition[] = [
  {
    projectKey: 'cs106l/gapbuffer',
    title: 'GapBuffer',
    description:
      'Implement a gap buffer and satisfy the provided CMake/CTest suite.',
    assignmentDir: 'courses/cs106l/assignments/GapBuffer',
    starterFileName: 'gapbuffer-starter.zip',
    allowedPaths: ['.nibras/**', 'gap_buffer.h'],
    milestoneDescription:
      'Implement the gap buffer data structure and pass the provided tests.',
  },
  {
    projectKey: 'cs106l/hashmap',
    title: 'HashMap',
    description:
      'Implement a hash map and iterator that pass the provided CMake/CTest suite.',
    assignmentDir: 'courses/cs106l/assignments/HashMap',
    starterFileName: 'hashmap-starter.zip',
    allowedPaths: [
      '.nibras/**',
      'hashmap.cpp',
      'hashmap.h',
      'hashmap_iterator.h',
      'test_settings.h',
    ],
    milestoneDescription:
      'Implement the custom hash map and iterator behavior required by the tests.',
  },
  {
    projectKey: 'cs106l/kdtree',
    title: 'KDTree',
    description:
      'Implement the KD-tree and supporting structures that pass the provided tests.',
    assignmentDir: 'courses/cs106l/assignments/KDTree',
    starterFileName: 'kdtree-starter.zip',
    allowedPaths: [
      '.nibras/**',
      'bounded_priority_queue.h',
      'kd_tree.h',
      'point.h',
    ],
    milestoneDescription:
      'Implement the KD-tree search structures and pass the provided tests.',
  },
] as const;

function repoRoot(): string {
  return path.resolve(__dirname, '../../../../');
}

export function listCs106lProjectDefinitions(): readonly Cs106lProjectDefinition[] {
  return CS106L_PROJECTS;
}

export function getCs106lProjectDefinition(
  projectKey: string,
): Cs106lProjectDefinition | null {
  return (
    CS106L_PROJECTS.find((entry) => entry.projectKey === projectKey) || null
  );
}

export function buildCs106lManifest(
  apiBaseUrl: string,
  projectKey: string,
): ProjectManifest {
  const definition = getCs106lProjectDefinition(projectKey);
  if (!definition) {
    throw new Error(`Unknown CS106L project: ${projectKey}`);
  }
  return {
    projectKey,
    releaseVersion: CS106L_RELEASE_VERSION,
    apiBaseUrl,
    defaultBranch: 'main',
    buildpack: { node: '20' },
    test: {
      mode: 'command',
      command: CS106L_TEST_COMMAND,
      commands: {
        default: CS106L_TEST_COMMAND,
        windows: CS106L_TEST_COMMAND,
      },
      supportsPrevious: false,
    },
    submission: {
      allowedPaths: definition.allowedPaths,
      waitForVerificationSeconds: 120,
    },
  };
}

export function buildCs106lStarter(projectKey: string): {
  kind: 'bundle';
  storageKey: string;
  fileName: string;
} {
  const definition = getCs106lProjectDefinition(projectKey);
  if (!definition) {
    throw new Error(`Unknown CS106L project: ${projectKey}`);
  }
  return {
    kind: 'bundle',
    storageKey: `repo-dir://${definition.assignmentDir}`,
    fileName: definition.starterFileName,
  };
}

export function resolveRepoDirStorageKey(storageKey: string): string {
  const prefix = 'repo-dir://';
  if (!storageKey.startsWith(prefix)) {
    throw new Error(`Unsupported storage key: ${storageKey}`);
  }
  return path.resolve(repoRoot(), storageKey.slice(prefix.length));
}

export function readCs106lTaskText(projectKey: string): string {
  const definition = getCs106lProjectDefinition(projectKey);
  if (!definition) {
    throw new Error(`Unknown CS106L project: ${projectKey}`);
  }
  return fs.readFileSync(
    path.join(repoRoot(), definition.assignmentDir, 'README.md'),
    'utf8',
  );
}
