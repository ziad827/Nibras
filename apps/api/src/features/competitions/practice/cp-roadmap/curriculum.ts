import fs from 'node:fs';
import path from 'node:path';
import { topicList } from './data/topic-list';

export type CpRoadmapTopicMeta = {
  topic_title: string;
  topic_id: string;
  difficulty?: number;
  importance?: number;
  phase?: number;
  prerequisites?: string;
};

export type CpRoadmapSubCategory = {
  sub_category_title: string;
  sub_category_id: string;
  sub_category_desc?: string;
  topics: CpRoadmapTopicMeta[];
};

export type CpRoadmapCategory = {
  category_title: string;
  category_id: string;
  category_desc?: string;
  sub_categories: CpRoadmapSubCategory[];
};

export type CpRoadmapResource = {
  resource_title: string;
  resource_url: string;
  is_starred?: boolean;
  resource_comments?: string;
};

export type CpRoadmapTopicInfo = {
  topic_id: string;
  problem_order?: string[];
  is_data_complete?: boolean;
  completion_count?: number;
  template_codes?: string[];
  resources?: CpRoadmapResource[];
};

export type CpRoadmapProblemEntry = {
  problem_id: string;
  problem_title: string;
  problem_url: string;
  difficulty?: number;
  is_starred?: boolean;
  solve_count?: number;
  topics?: string[];
};

const dataDir = path.join(__dirname, 'data');

function loadJson<T>(filename: string): T {
  const raw = fs.readFileSync(path.join(dataDir, filename), 'utf8');
  return JSON.parse(raw) as T;
}

export const CP_ROADMAP_CATEGORIES = topicList as CpRoadmapCategory[];

export const CP_ROADMAP_TOPIC_INFO =
  loadJson<Record<string, CpRoadmapTopicInfo>>('topic-info.json');

export const CP_ROADMAP_PROBLEMS = loadJson<
  Record<string, CpRoadmapProblemEntry>
>('topic-problems.json');

export const CP_ROADMAP_TOPIC_COUNT = CP_ROADMAP_CATEGORIES.reduce(
  (sum, cat) =>
    sum + cat.sub_categories.reduce((s, sub) => s + sub.topics.length, 0),
  0,
);

const topicMetaById = new Map<
  string,
  CpRoadmapTopicMeta & { categoryId: string; subCategoryId: string }
>();

for (const category of CP_ROADMAP_CATEGORIES) {
  for (const sub of category.sub_categories) {
    for (const topic of sub.topics) {
      topicMetaById.set(topic.topic_id, {
        ...topic,
        categoryId: category.category_id,
        subCategoryId: sub.sub_category_id,
      });
    }
  }
}

export function getTopicMeta(topicId: string) {
  return topicMetaById.get(topicId);
}

export function getTopicInfo(topicId: string): CpRoadmapTopicInfo | undefined {
  return CP_ROADMAP_TOPIC_INFO[topicId];
}

export function getProblemEntry(
  problemId: string,
): CpRoadmapProblemEntry | undefined {
  return CP_ROADMAP_PROBLEMS[problemId];
}

export function orderedProblemsForTopic(
  topicId: string,
): CpRoadmapProblemEntry[] {
  const info = getTopicInfo(topicId);
  const order = info?.problem_order ?? [];
  return order
    .map((id) => getProblemEntry(id))
    .filter((p): p is CpRoadmapProblemEntry => Boolean(p));
}

export function allRoadmapProblemIds(): string[] {
  const ids = new Set<string>();
  for (const info of Object.values(CP_ROADMAP_TOPIC_INFO)) {
    for (const id of info.problem_order ?? []) {
      ids.add(id);
    }
  }
  return [...ids];
}
