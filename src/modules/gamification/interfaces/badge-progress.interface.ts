export interface BadgeProgressInfo {
  _id: string;
  name: string;
  description: string;
  type: string;
  icon: string;
  pointsValue: number;
  level: number;
  earned: boolean;
  earnedAt: Date | null;
}
