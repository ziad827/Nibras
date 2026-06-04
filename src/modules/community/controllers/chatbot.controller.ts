import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import { SessionAuthGuard } from '@common/guards/auth.guards';
import type { AuthenticatedUser } from '@modules/auth/types/authenticated-user.type';
import { ChatbotService } from '../services/chatbot.service';
import { ChatbotAskDto } from '../dto/chatbot-ask.dto';
import { ChatbotPublishDto } from '../dto/chatbot-publish.dto';

type RequestWithUser = Request & { user: AuthenticatedUser };

@ApiTags('Chatbot')
@UseGuards(SessionAuthGuard)
@Controller('chatbot')
export class ChatbotController {
  constructor(private chatbotService: ChatbotService) {}

  @Post('ask')
  @ApiOperation({ summary: 'Ask the chatbot a question' })
  async ask(@Body() dto: ChatbotAskDto) {
    const response = await this.chatbotService.processChatbotQuestion(
      dto.question,
    );
    return {
      success: true,
      message: 'Answer generated successfully',
      data: {
        question: dto.question,
        hints: response.hints,
        tags: response.tags,
        finalAnswer: response.finalAnswer,
        communityQuestion: response.communityQuestion,
        xai: response.xai,
      },
    };
  }

  @Post('publish')
  @ApiOperation({ summary: 'Publish chatbot answer to community' })
  async publish(@Body() dto: ChatbotPublishDto, @Req() req: RequestWithUser) {
    const result = await this.chatbotService.publishChatbotAnswer(
      req.user.id,
      dto.title,
      dto.question,
      dto.finalAnswer,
      dto.tags,
    );
    return {
      success: true,
      message: 'Published to community successfully',
      data: {
        title: dto.title,
        question: result.question,
        answer: result.answer,
      },
    };
  }
}
