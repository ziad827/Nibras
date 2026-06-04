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
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { isValidObjectId } from 'mongoose';
import { TagService } from '../services/tag.service';
import { CreateTagDto, UpdateTagDto } from '../dto/tag.dto';
import { PaginationQueryDto } from '../dto/pagination-query.dto';

@ApiTags('Tags')
@Controller('tags')
export class TagController {
  constructor(private tagService: TagService) {}

  @Get('popular')
  @ApiOperation({ summary: 'Get popular tags' })
  async getPopularTags(@Query('limit') limit?: string) {
    const tags = await this.tagService.getPopularTags(Number(limit) || 5);
    return {
      success: true,
      message: 'Tags fetched successfully',
      data: { tags },
    };
  }

  @Get('autocomplete')
  @ApiOperation({ summary: 'Auto-suggest tags by query' })
  async autocomplete(@Query('q') q: string, @Query('limit') limit?: string) {
    const tags = await this.tagService.searchTags(q || '', Number(limit) || 10);
    return {
      success: true,
      message: 'Tags fetched successfully',
      data: { tags },
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all tags' })
  async getAllTags(@Query() query: PaginationQueryDto) {
    const result = await this.tagService.getAllTags(query.page, query.limit);
    return {
      success: true,
      message: 'Tags fetched successfully',
      data: result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tag by ID' })
  async getTagById(@Param('id') id: string) {
    if (!isValidObjectId(id)) throw new BadRequestException('Invalid tag ID');
    const tag = await this.tagService.getTagById(id);
    if (!tag) throw new NotFoundException('Tag not found');
    return {
      success: true,
      message: 'Tag fetched successfully',
      data: { tag },
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create tag' })
  async create(@Body() dto: CreateTagDto) {
    const tag = await this.tagService.create(dto);
    return {
      success: true,
      message: 'Tag created successfully',
      data: { tag },
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update tag' })
  async update(@Param('id') id: string, @Body() dto: UpdateTagDto) {
    if (!isValidObjectId(id)) throw new BadRequestException('Invalid tag ID');
    const tag = await this.tagService.update(id, dto);
    return {
      success: true,
      message: 'Tag updated successfully',
      data: { tag },
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete tag' })
  async delete(@Param('id') id: string) {
    if (!isValidObjectId(id)) throw new BadRequestException('Invalid tag ID');
    await this.tagService.delete(id);
    return { success: true, message: 'Tag deleted successfully' };
  }
}
