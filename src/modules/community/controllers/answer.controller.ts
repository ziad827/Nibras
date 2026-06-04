import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Req,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import { isValidObjectId } from 'mongoose';
import { SessionAuthGuard } from '@common/guards/auth.guards';
import type { AuthenticatedUser } from '@modules/auth/types/authenticated-user.type';
import { AnswerService } from '../services/answer.service';
import { CreateAnswerDto, UpdateAnswerDto } from '../dto/answer.dto';
import { PaginationQueryDto } from '../dto/pagination-query.dto';

type RequestWithUser = Request & { user: AuthenticatedUser };

@ApiTags('Answers')
@UseGuards(SessionAuthGuard)
@Controller('answers')
export class AnswerController {
  constructor(private answerService: AnswerService) {}

  @Post(':questionId')
  @ApiOperation({ summary: 'Create an answer for a question' })
  async create(
    @Param('questionId') questionId: string,
    @Body() dto: CreateAnswerDto,
    @Req() req: RequestWithUser,
  ) {
    if (!isValidObjectId(questionId))
      throw new BadRequestException('Invalid question ID');
    const answer = await this.answerService.create({
      body: dto.body,
      author: req.user.id,
      question: questionId,
    });
    return {
      success: true,
      message: 'Answer created successfully',
      data: { answer },
    };
  }

  @Get('question/:questionId')
  @ApiOperation({ summary: 'Get answers for a question' })
  async findByQuestion(
    @Param('questionId') questionId: string,
    @Query() query: PaginationQueryDto,
  ) {
    if (!isValidObjectId(questionId))
      throw new BadRequestException('Invalid question ID');
    const result = await this.answerService.findByQuestion(
      questionId,
      query.page,
      query.limit,
    );
    return {
      success: true,
      message: 'Answers fetched successfully',
      data: result,
    };
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get answers by user' })
  async findByUser(
    @Param('userId') userId: string,
    @Query() query: PaginationQueryDto,
  ) {
    if (!isValidObjectId(userId))
      throw new BadRequestException('Invalid user ID');
    const result = await this.answerService.findByUser(
      userId,
      query.page,
      query.limit,
    );
    return {
      success: true,
      message: 'User answers fetched successfully',
      data: result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get answer by ID' })
  async findById(@Param('id') id: string) {
    if (!isValidObjectId(id))
      throw new BadRequestException('Invalid answer ID');
    const answer = await this.answerService.findById(id);
    if (!answer) throw new NotFoundException('Answer not found');
    return {
      success: true,
      message: 'Answer fetched successfully',
      data: { answer },
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update answer' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAnswerDto,
    @Req() req: RequestWithUser,
  ) {
    if (!isValidObjectId(id))
      throw new BadRequestException('Invalid answer ID');
    const answer = await this.answerService.findById(id);
    if (!answer) throw new NotFoundException('Answer not found');
    const authorRaw = (answer as unknown as Record<string, unknown>).author;
    const rawId =
      authorRaw != null && typeof authorRaw === 'object'
        ? (authorRaw as Record<string, unknown>)._id
        : authorRaw;
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    const authorId = rawId != null ? String(rawId) : '';
    if (authorId !== req.user.id) {
      throw new ForbiddenException('You are not allowed to update this answer');
    }
    const updated = await this.answerService.update(id, dto);
    return {
      success: true,
      message: 'Answer updated successfully',
      data: { answer: updated },
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete answer' })
  async delete(@Param('id') id: string, @Req() req: RequestWithUser) {
    if (!isValidObjectId(id))
      throw new BadRequestException('Invalid answer ID');
    const answer = await this.answerService.findById(id);
    if (!answer) throw new NotFoundException('Answer not found');
    const authorRaw = (answer as unknown as Record<string, unknown>).author;
    const rawId =
      authorRaw != null && typeof authorRaw === 'object'
        ? (authorRaw as Record<string, unknown>)._id
        : authorRaw;
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    const authorId = rawId != null ? String(rawId) : '';
    if (authorId !== req.user.id) {
      throw new ForbiddenException('You are not allowed to delete this answer');
    }
    await this.answerService.delete(id);
    return { success: true, message: 'Answer deleted successfully' };
  }

  @Patch(':id/accept')
  @ApiOperation({ summary: 'Accept answer (question author or moderator)' })
  async accept(@Param('id') id: string, @Req() req: RequestWithUser) {
    if (!isValidObjectId(id))
      throw new BadRequestException('Invalid answer ID');
    const answer = await this.answerService.accept(
      id,
      req.user.id,
      req.user.role,
    );
    return {
      success: true,
      message: 'Answer accepted successfully',
      data: { answer },
    };
  }
}
