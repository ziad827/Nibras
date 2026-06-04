export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface VoteResult {
  action: 'created' | 'updated' | 'removed';
  voteValue: number;
  votesCount: number;
}

export interface MyVoteResult {
  value: number;
}
