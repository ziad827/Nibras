import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Contest } from '../schemas/contest.schema';
import { ContestReminder } from '../schemas/contest-reminder.schema';

@Injectable()
export class ContestReminderJob {
  private readonly logger = new Logger(ContestReminderJob.name);

  constructor(
    @InjectModel(ContestReminder.name)
    private readonly reminderModel: Model<ContestReminder>,
    @InjectModel(Contest.name) private readonly contestModel: Model<Contest>,
  ) {}

  async run(): Promise<void> {
    const reminders = await this.reminderModel
      .find({ notified: false })
      .limit(50)
      .exec();

    const now = Date.now();
    for (const r of reminders) {
      const contest = await this.contestModel.findById(r.contestId).exec();
      if (!contest) continue;

      const notifyAt = contest.startsAt.getTime() - r.minutesBefore * 60 * 1000;
      if (now >= notifyAt && now < contest.startsAt.getTime()) {
        this.logger.log(
          `Contest reminder: user ${r.userId.toString()} contest ${contest.name} in ${r.minutesBefore}m`,
        );
        r.notified = true;
        await r.save();
      }
    }
  }
}
