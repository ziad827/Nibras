import { Types } from 'mongoose';

export interface PopulatedAuthor {
  _id: Types.ObjectId;
  name?: string;
  avatar?: string;
  role?: { name?: string; _id?: Types.ObjectId };
}

export interface PopulatedCourse {
  _id: Types.ObjectId;
  title?: string;
}

export interface PopulatedTag {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  usageCount?: number;
  category?: string;
  synonyms?: string[];
}

export interface PopulatedQuestion {
  _id: Types.ObjectId;
  title: string;
  body: string;
  author: PopulatedAuthor;
  course?: PopulatedCourse | Types.ObjectId;
  tags: PopulatedTag[];
  status: string;
  votesCount: number;
  answersCount: number;
  isAnonymous: boolean;
  viewCount: number;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PopulatedThread {
  _id: Types.ObjectId;
  title: string;
  body: string;
  course: PopulatedCourse | Types.ObjectId;
  author: PopulatedAuthor;
  isPinned: boolean;
  status: string;
  tags: PopulatedTag[];
  postsCount: number;
  votesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PopulatedPost {
  _id: Types.ObjectId;
  body: string;
  thread: Types.ObjectId;
  author: PopulatedAuthor;
  votesCount: number;
  isAccepted: boolean;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PopulatedAnswer {
  _id: Types.ObjectId;
  question: Types.ObjectId;
  author: PopulatedAuthor;
  body: string;
  isPinned: boolean;
  isAccepted: boolean;
  isFromAI: boolean;
  votesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface VoteTarget {
  _id: Types.ObjectId;
  author?: Types.ObjectId | { _id: Types.ObjectId };
  question?: Types.ObjectId;
  thread?: Types.ObjectId;
}
