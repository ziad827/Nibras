import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { isValidObjectId } from 'mongoose';
import { SessionAuthGuard } from '@common/guards/auth.guards';
import { QuestionService } from '../services/question.service';
import { AnswerService } from '../services/answer.service';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@modules/auth/types/authenticated-user.type';
import { CreateQuestionDto, UpdateQuestionDto } from '../dto/question.dto';
import { ToggleBookmarkDto } from '../dto/bookmark.dto';
import { PaginationQueryDto } from '../dto/pagination-query.dto';

@ApiTags('Questions')
@UseGuards(SessionAuthGuard)
@Controller('questions')
export class QuestionController {
  constructor(
    private questionService: QuestionService,
    private answerService: AnswerService,
  ) {}

  private isModerator(user: AuthenticatedUser): boolean {
    const role = user.role.toLowerCase();
    return role === 'admin' || role === 'super admin' || role === 'instructor';
  }

  @Post()
  @ApiOperation({ summary: 'Create a question' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateQuestionDto,
  ) {
    const question = await this.questionService.create({
      ...dto,
      author: user.id,
    });
    return {
      success: true,
      message: 'Question created successfully',
      data: { question },
    };
  }

  @Get('search')
  @ApiOperation({ summary: 'Full-text search questions' })
  async search(@Query('q') q: string, @Query() pagination: PaginationQueryDto) {
    if (!q?.trim()) throw new BadRequestException('Search query is required');
    const result = await this.questionService.findAll({
      search: q,
      page: pagination.page,
      limit: pagination.limit,
    });
    return {
      success: true,
      message: 'Search results fetched successfully',
      data: result,
    };
  }

  @Get('bookmarks')
  @ApiOperation({ summary: 'Get my bookmarked questions' })
  async getBookmarks(
    @CurrentUser() user: AuthenticatedUser,
    @Query() pagination: PaginationQueryDto,
  ) {
    const result = await this.questionService.getBookmarkedQuestions(
      user.id,
      pagination.page,
      pagination.limit,
    );
    return {
      success: true,
      message: 'Bookmarked questions fetched successfully',
      data: result,
    };
  }

  @Post(':id/bookmark')
  @ApiOperation({ summary: 'Toggle bookmark on a question' })
  async toggleBookmark(
    @Param('id') id: string,
    @Body() dto: ToggleBookmarkDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!isValidObjectId(id))
      throw new BadRequestException('Invalid question ID');
    const result = await this.questionService.setBookmark(user.id, id, dto.on);
    return {
      success: true,
      message: result.bookmarked
        ? 'Question bookmarked successfully'
        : 'Bookmark removed successfully',
      data: result,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List questions with filters' })
  async findAll(
    @Query()
    query: PaginationQueryDto & {
      search?: string;
      title?: string;
      tag?: string;
      course?: string;
      status?: string;
      sort?: string;
    },
  ) {
    const result = await this.questionService.findAll(query);
    return {
      success: true,
      message: 'Questions fetched successfully',
      data: result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single question with answers' })
  async findById(@Param('id') id: string) {
    if (!isValidObjectId(id))
      throw new BadRequestException('Invalid question ID');
    const question = await this.questionService.findByIdCached(id);
    if (!question) throw new NotFoundException('Question not found');
    const { answers, pagination: answerPagination } =
      await this.answerService.findByQuestion(id);
    return {
      success: true,
      message: 'Question fetched successfully',
      data: { question, answers, answerPagination },
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update question (author or moderator)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateQuestionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!isValidObjectId(id))
      throw new BadRequestException('Invalid question ID');
    const question = await this.questionService.findById(id);
    if (!question) throw new NotFoundException('Question not found');
    const authorId = question.author._id;

    if (String(authorId) !== String(user.id) && !this.isModerator(user)) {
      throw new ForbiddenException(
        'You are not allowed to update this question',
      );
    }
    const updated = await this.questionService.update(id, dto);
    return {
      success: true,
      message: 'Question updated successfully',
      data: { question: updated },
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete question (author or moderator)' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!isValidObjectId(id))
      throw new BadRequestException('Invalid question ID');
    const question = await this.questionService.findById(id);
    if (!question) throw new NotFoundException('Question not found');
    const authorId = question.author._id;
    if (String(authorId) !== String(user.id) && !this.isModerator(user)) {
      throw new ForbiddenException(
        'You are not allowed to delete this question',
      );
    }
    await this.questionService.softDelete(id);
    return { success: true, message: 'Question deleted successfully' };
  }
}
