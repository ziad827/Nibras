import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Req,
  BadRequestException,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import { isValidObjectId } from 'mongoose';
import { SessionAuthGuard } from '@common/guards/auth.guards';
import type { AuthenticatedUser } from '@modules/auth/types/authenticated-user.type';
import { FlagService } from '../services/flag.service';
import { CreateFlagDto, ReviewFlagDto } from '../dto/flag.dto';
import { PaginationQueryDto } from '../dto/pagination-query.dto';

type RequestWithUser = Request & { user: AuthenticatedUser };

@ApiTags('Flags')
@UseGuards(SessionAuthGuard)
@Controller('flags')
export class FlagController {
  constructor(private flagService: FlagService) {}

  private isModerator(user: AuthenticatedUser): boolean {
    const role = user.role.toLowerCase();
    return role === 'admin' || role === 'super admin';
  }

  @Post()
  @ApiOperation({ summary: 'Flag content as inappropriate' })
  async create(@Body() dto: CreateFlagDto, @Req() req: RequestWithUser) {
    if (!isValidObjectId(dto.targetId))
      throw new BadRequestException('Invalid target ID');
    const flag = await this.flagService.create({
      ...dto,
      flaggedBy: req.user.id,
    });
    return {
      success: true,
      message: 'Content flagged successfully',
      data: { flag },
    };
  }

  @Get('moderation/queue')
  @ApiOperation({ summary: 'Get moderation queue (admin only)' })
  async getModerationQueue(
    @Query()
    query: PaginationQueryDto & { status?: string; targetType?: string },
    @Req() req: RequestWithUser,
  ) {
    if (!this.isModerator(req.user)) {
      throw new ForbiddenException('Only admins can view the moderation queue');
    }
    const result = await this.flagService.findAll(query);
    return {
      success: true,
      message: 'Moderation queue fetched successfully',
      data: result,
    };
  }

  @Get('moderation/queue/count')
  @ApiOperation({ summary: 'Get pending moderation count (admin only)' })
  async getPendingCount(@Req() req: RequestWithUser) {
    if (!this.isModerator(req.user)) {
      throw new ForbiddenException('Only admins can view moderation counts');
    }
    const count = await this.flagService.getPendingCount();
    return {
      success: true,
      message: 'Pending count fetched successfully',
      data: { pendingCount: count },
    };
  }

  @Patch(':id/review')
  @ApiOperation({ summary: 'Review a flag (admin only)' })
  async review(
    @Param('id') id: string,
    @Body() dto: ReviewFlagDto,
    @Req() req: RequestWithUser,
  ) {
    if (!this.isModerator(req.user)) {
      throw new ForbiddenException('Only admins can review flags');
    }
    if (!isValidObjectId(id)) throw new BadRequestException('Invalid flag ID');
    const flag = await this.flagService.review(id, dto.status, req.user.id);
    return {
      success: true,
      message: `Flag ${dto.status} successfully`,
      data: { flag },
    };
  }
}
