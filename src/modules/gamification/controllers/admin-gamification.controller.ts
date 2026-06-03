import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { isValidObjectId } from 'mongoose';
import { SessionAuthGuard, RolesGuard } from '@common/guards/auth.guards';
import { Roles } from '@common/decorators/auth.decorators';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Badge } from '../schemas/badge.schema';
import { CreateBadgeDto, UpdateBadgeDto } from '../dto/create-badge.dto';

@ApiTags('Admin - Gamification')
@ApiBearerAuth('session')
@ApiCookieAuth('nibras_web_session')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles('admin', 'super-admin')
@Controller('admin/badges')
export class AdminGamificationController {
  constructor(@InjectModel(Badge.name) private badgeModel: Model<Badge>) {}

  @Post()
  @ApiOperation({ summary: 'Create a custom badge' })
  async createBadge(@Body() dto: CreateBadgeDto) {
    const existing = await this.badgeModel.findOne({ name: dto.name }).lean();
    if (existing) {
      throw new BadRequestException(
        `Badge with name "${dto.name}" already exists`,
      );
    }

    const badge = await this.badgeModel.create(dto);
    return {
      success: true,
      message: 'Badge created successfully',
      data: badge,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List all badges (admin view)' })
  async listAllBadges() {
    const badges = await this.badgeModel
      .find()
      .sort({ pointsValue: -1, name: 1 })
      .lean();
    return {
      success: true,
      message: 'Badges fetched successfully',
      data: badges,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a badge' })
  async updateBadge(@Param('id') id: string, @Body() dto: UpdateBadgeDto) {
    if (!isValidObjectId(id)) throw new BadRequestException('Invalid badge ID');

    const badge = await this.badgeModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true })
      .lean();
    if (!badge) throw new NotFoundException('Badge not found');

    return {
      success: true,
      message: 'Badge updated successfully',
      data: badge,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a badge' })
  async deleteBadge(@Param('id') id: string) {
    if (!isValidObjectId(id)) throw new BadRequestException('Invalid badge ID');

    const badge = await this.badgeModel.findByIdAndDelete(id).lean();
    if (!badge) throw new NotFoundException('Badge not found');

    return {
      success: true,
      message: 'Badge deleted successfully',
    };
  }
}
