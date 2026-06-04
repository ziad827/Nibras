import { Model, Types } from 'mongoose';
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Flag } from '../schemas/flag.schema';

function normalizePagination(page?: number, limit?: number) {
  const p = Math.max(Number(page) || 1, 1);
  const l = Math.min(Math.max(Number(limit) || 20, 1), 100);
  return { page: p, limit: l, skip: (p - 1) * l };
}

@Injectable()
export class FlagService {
  constructor(@InjectModel(Flag.name) private flagModel: Model<Flag>) {}

  async create(data: {
    targetId: string;
    targetType: string;
    reason: string;
    flaggedBy: string;
  }) {
    const flag = await this.flagModel.create({
      targetId: data.targetId,
      targetType: data.targetType,
      reason: data.reason,
      flaggedBy: data.flaggedBy,
    });
    return flag;
  }

  async findAll(filters: {
    page?: number;
    limit?: number;
    status?: string;
    targetType?: string;
  }) {
    const query: Record<string, unknown> = {};
    const { page, limit, skip } = normalizePagination(
      filters.page,
      filters.limit,
    );

    if (filters.status) query.status = filters.status;
    if (filters.targetType) query.targetType = filters.targetType;

    const [flags, total] = await Promise.all([
      this.flagModel
        .find(query)
        .populate('flaggedBy', 'name avatar email')
        .populate('reviewedBy', 'name avatar email')
        .populate('resolvedBy', 'name avatar email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.flagModel.countDocuments(query),
    ]);

    return {
      flags,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async review(flagId: string, status: string, reviewedBy: string) {
    const flag = await this.flagModel.findById(flagId);
    if (!flag) throw new NotFoundException('Flag not found');
    if (flag.status !== 'pending') {
      throw new ForbiddenException('Flag has already been reviewed');
    }

    flag.status = status;
    flag.reviewedBy = new Types.ObjectId(reviewedBy);
    flag.reviewedAt = new Date();
    if (status === 'resolved') {
      flag.resolvedBy = new Types.ObjectId(reviewedBy);
    }
    return flag.save();
  }

  async getPendingCount() {
    return this.flagModel.countDocuments({ status: 'pending' });
  }
}
