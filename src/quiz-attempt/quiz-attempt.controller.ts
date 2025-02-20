import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post, Query,
  StreamableFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { QuizAttemptService } from './quiz-attempt.service';
import { CreateQuizAttemptDto } from './dto/create-quiz-attempt.dto';
import {
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { ResultMessage } from '../global/interfaces/result-message';
import { GetUserEmail } from '../global/decorators/get-user-email.decorator';
import { Roles } from '../global/decorators/roles.decorator';
import { RoleEnum } from '../global/enums/role.enum';
import { RoleGuard } from '../role/guards/role.guard';
import { ExportType } from '../global/enums/export-type.enum';
import { Readable } from 'stream';
import { ExportAttemptOptionsDto } from './dto/export-attempt-options.dto';
import { ExportQuizAttemptsByCompanyData } from '../global/interfaces/export-quiz-attempts-by-company-data.interface';

@ApiTags('Quiz Attempts')
@Controller('quiz-attempt')
@UseGuards(AuthGuard)
export class QuizAttemptController {
  constructor(private readonly quizAttemptService: QuizAttemptService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new attempt.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The attempt has been successfully saved.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request.',
  })
  @Roles(RoleEnum.ADMIN, RoleEnum.OWNER, RoleEnum.MEMBER)
  @UseGuards(RoleGuard)
  public async createNewQuizAttempt(
    @Body() createQuizAttemptDto: CreateQuizAttemptDto,
  ): Promise<ResultMessage> {
    return this.quizAttemptService.createNewQuizAttempt(createQuizAttemptDto);
  }

  @Get('company-score/:companyId')
  @ApiOperation({ summary: "Get user's score in company." })
  @ApiParam({
    name: 'companyId',
    description: 'The ID of the company.',
    example: 'e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "The user's score in company.",
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request',
  })
  @UseInterceptors(ClassSerializerInterceptor)
  public async getUserCompanyScore(
    @Param('companyId') companyId: string,
    @GetUserEmail() email: string,
  ): Promise<ResultMessage> {
    return this.quizAttemptService.getUserCompanyScore(companyId, email);
  }

  @Get('total-score')
  @ApiOperation({ summary: "Get user's total score." })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "The user's total score.",
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request',
  })
  @UseInterceptors(ClassSerializerInterceptor)
  public async getUserTotalScore(
    @GetUserEmail() email: string,
  ): Promise<ResultMessage> {
    return this.quizAttemptService.getUserTotalScore(email);
  }

  @Get('export/user/:format')
  @ApiOperation({
    summary: 'Export quiz attempts',
    description: 'Exports all quiz attempts for user in the specified format (JSON or CSV).',
  })
  @ApiParam({
    name: 'format',
    type: 'string',
    description: 'Export data format',
  })
  @ApiProduces('application/json', 'text/csv')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful export',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No quiz attempts found for user',
  })
  async exportQuizAttemptsByUser(
    @GetUserEmail() email: string,
    @Param('format') format: ExportType,
  ): Promise<StreamableFile> {
    const data: ExportQuizAttemptsByCompanyData = await this.quizAttemptService.exportQuizAttemptsByUser(email, format);
    const stream: Readable = Readable.from([data.data]);
    return new StreamableFile(stream, {
      type: data.contentType,
      disposition: `attachment; filename=${data.filename}`,
    });
  }

  @Get('export/company/:format')
  @ApiOperation({
    summary: 'Export quiz attempts',
    description: 'Exports all quiz attempts for user in the specified format (JSON or CSV).',
  })
  @ApiParam({
    name: 'format',
    type: 'string',
    description: 'Export data format',
  })
  @ApiProduces('application/json')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful JSON export',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No quiz attempts found for the company',
  })
  @Roles(RoleEnum.ADMIN, RoleEnum.OWNER)
  @UseGuards(RoleGuard)
  public async exportQuizAttemptsByCompany(
    @Param('format') format: ExportType,
    @Query() exportAttemptOptionsDto: ExportAttemptOptionsDto,
  ): Promise<StreamableFile> {
    const data: ExportQuizAttemptsByCompanyData =
      await this.quizAttemptService.exportQuizAttemptsByCompany(
        format,
        exportAttemptOptionsDto,
      );
    const stream: Readable = Readable.from([data.data]);
    return new StreamableFile(stream, {
      type: data.contentType,
      disposition: `attachment; filename=${data.filename}`,
    });
  }
}
