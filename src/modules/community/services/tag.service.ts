import { Model } from 'mongoose';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Tag } from '../schemas/tag.schema';

function normalizePagination(page?: number, limit?: number) {
  const p = Math.max(Number(page) || 1, 1);
  const l = Math.min(Math.max(Number(limit) || 20, 1), 100);
  return { page: p, limit: l, skip: (p - 1) * l };
}

@Injectable()
export class TagService {
  constructor(@InjectModel(Tag.name) private tagModel: Model<Tag>) {}

  async getTagIdByName(tagName: string) {
    const tag = await this.tagModel.findOne({
      name: { $regex: new RegExp(`^${tagName}$`, 'i') },
    });
    if (!tag) throw new NotFoundException(`Tag "${tagName}" not found`);
    return tag._id;
  }

  async getTagByName(tagName: string) {
    return this.tagModel.findOne({
      name: { $regex: new RegExp(`^${tagName}$`, 'i') },
    });
  }

  async getPopularTags(limit = 20) {
    return this.tagModel.find().sort({ usageCount: -1 }).limit(limit).lean();
  }

  async getAllTags(page?: number, limit?: number) {
    const { page: p, limit: l, skip } = normalizePagination(page, limit);
    const [tags, total] = await Promise.all([
      this.tagModel.find().sort({ name: 1 }).skip(skip).limit(l).lean(),
      this.tagModel.countDocuments(),
    ]);
    return {
      tags,
      pagination: {
        page: p,
        limit: l,
        total,
        totalPages: Math.ceil(total / l) || 1,
      },
    };
  }

  async searchTags(query: string, limit = 10) {
    if (!query?.trim()) return this.getPopularTags(limit);
    const regex = new RegExp(query, 'i');
    return this.tagModel
      .find({ name: { $regex: regex } })
      .sort({ usageCount: -1 })
      .limit(limit)
      .lean();
  }

  async getTagById(id: string) {
    return this.tagModel.findById(id).lean();
  }

  async create(data: { name: string; description?: string }) {
    const existing = await this.tagModel.findOne({ name: data.name });
    if (existing) throw new BadRequestException('Tag already exists');
    return this.tagModel.create({
      name: String(data.name).trim(),
      description: data.description || '',
    });
  }

  async update(id: string, data: { name?: string; description?: string }) {
    const tag = await this.tagModel.findById(id);
    if (!tag) throw new NotFoundException('Tag not found');

    if (data.name) {
      const existing = await this.tagModel.findOne({
        name: data.name,
        _id: { $ne: id },
      });
      if (existing) throw new BadRequestException('Tag name already exists');
      tag.name = String(data.name).trim();
    }
    if (data.description !== undefined) tag.description = data.description;
    return tag.save();
  }

  async delete(id: string) {
    const tag = await this.tagModel.findByIdAndDelete(id);
    if (!tag) throw new NotFoundException('Tag not found');
    return tag;
  }

  async incrementUsageCount(tagIds: string[], delta = 1) {
    if (!tagIds?.length) return;
    await this.tagModel.updateMany(
      { _id: { $in: tagIds } },
      { $inc: { usageCount: delta } },
    );
  }
}
