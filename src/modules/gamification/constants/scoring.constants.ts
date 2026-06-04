export const EVENT_POINTS = {
  question_created: 5,
  answer_created: 15,
  accepted_answer: 25,
  question_upvote_received: 2,
  answer_upvote_received: 3,
  thread_created: 5,
  badge_awarded: 15,
  contest_joined: 15,
  contest_top_25: 25,
  contest_top_10: 50,
  lesson_completed: 2,
  section_completed: 5,
  course_completed: 100,
  assignment_submitted: 10,
  assignment_approved: 20,
  high_grade: 15,
  daily_learning_activity: 3,
  learning_streak: 25,
} as const;

export const PROBLEM_POINTS_BY_DIFFICULTY = {
  beginner: 10,
  newbie: 20,
  intermediate: 35,
  advanced: 50,
} as const;

export const VOTE_DAILY_CAPS = {
  question_upvote_received: 20,
  answer_upvote_received: 30,
} as const;

export const STREAK_MILESTONES = [7, 14, 30, 60] as const;

export const CONTEST_RATING_GAIN = {
  pointsPer10Rating: 1,
  maxPoints: 30,
} as const;

export const HIGH_GRADE_THRESHOLD = 85;

export const COURSE_PROGRESS_BONUS_MULTIPLIER = 0.5;
