export enum ActivityType {
  ProblemSolved = 'problem_solved',
  ContestJoined = 'contest_joined',
  ContestTop25 = 'contest_top_25',
  ContestTop10 = 'contest_top_10',
  ContestRatingGain = 'contest_rating_gain',
  QuestionCreated = 'question_created',
  AnswerCreated = 'answer_created',
  AcceptedAnswer = 'accepted_answer',
  QuestionUpvoteReceived = 'question_upvote_received',
  AnswerUpvoteReceived = 'answer_upvote_received',
  ThreadCreated = 'thread_created',
  BadgeAwarded = 'badge_awarded',
  LessonCompleted = 'lesson_completed',
  SectionCompleted = 'section_completed',
  CourseCompleted = 'course_completed',
  AssignmentSubmitted = 'assignment_submitted',
  AssignmentApproved = 'assignment_approved',
  HighGrade = 'high_grade',
  DailyLearningActivity = 'daily_learning_activity',
  LearningStreak = 'learning_streak',
  CourseProgressBonus = 'course_progress_bonus',
}

export enum ActivitySource {
  Problems = 'problems',
  Contests = 'contests',
  Community = 'community',
  Courses = 'courses',
  Gamification = 'gamification',
  Manual = 'manual',
}

export enum BadgeType {
  Academic = 'academic',
  Community = 'community',
  Competitive = 'competitive',
  Project = 'project',
}

export enum BadgeLevel {
  Bronze = 'bronze',
  Silver = 'silver',
  Gold = 'gold',
}

export enum LeaderboardPeriod {
  Weekly = 'weekly',
  Monthly = 'monthly',
  AllTime = 'all-time',
}

export enum LeaderboardScopeType {
  Global = 'global',
  Course = 'course',
}

export enum LeaderboardType {
  Academic = 'academic',
  Competitive = 'competitive',
  Community = 'community',
}
