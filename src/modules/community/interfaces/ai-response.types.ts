export interface AiServiceData {
  hints: string[];
  answer: string;
  tags: string[];
  xai?: Record<string, unknown>;
  question_id?: string;
}

export interface AiServiceResponse {
  type: 'community_match' | 'refused' | 'normal';
  data: AiServiceData;
}

export interface AiFormattedResponse {
  question: string;
  hints: string[];
  finalAnswer: string;
  tags: string[];
  xai: Record<string, unknown> | null;
  communityQuestion?: string;
}
