import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Header,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
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

  @Get('export/json/user')
  @ApiOperation({
    summary: 'Export quiz attempts as JSON',
    description: 'Exports all quiz attempts for user in JSON format.',
  })
  @ApiProduces('application/json')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful JSON export',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No quiz attempts found for user',
  })
  @Header('Content-Type', 'application/json')
  @Header('Content-Disposition', 'attachment; filename=user_quiz_attempts.json')
  async exportQuizAttemptsByUserToJSON(
    @GetUserEmail() email: string,
  ): Promise<StreamableFile> {
    const csvData: string =
      await this.quizAttemptService.exportQuizAttemptsByUser(
        email,
        ExportType.JSON,
      );
    if (!csvData) {
      throw new NotFoundException('No quiz attempts found for user.');
    }
    const stream: Readable = Readable.from([csvData]);
    return new StreamableFile(stream);
  }

  @Get('export/json/company/:companyId')
  @ApiOperation({
    summary: 'Export quiz attempts as JSON',
    description: 'Exports all quiz attempts for a company in JSON format.',
  })
  @ApiParam({
    name: 'companyId',
    type: 'string',
    description: 'Company ID to export data for',
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
  @Header('Content-Type', 'application/json')
  @Header(
    'Content-Disposition',
    'attachment; filename=company_quiz_attempts.json',
  )
  public async exportQuizAttemptsByCompanyToJSON(
    @Param('companyId') companyId: string,
  ): Promise<StreamableFile> {
    const jsonData: string =
      await this.quizAttemptService.exportQuizAttemptsByCompany(
        companyId,
        ExportType.JSON,
      );
    if (!jsonData) {
      throw new NotFoundException('No quiz attempts found for the company.');
    }
    const stream: Readable = Readable.from([jsonData]);
    return new StreamableFile(stream);
  }

  @Get('export/json/company-user/:companyId/:userId')
  @ApiOperation({
    summary: 'Export quiz attempts as JSON',
    description: 'Exports all quiz attempts for a company in JSON format.',
  })
  @ApiParam({
    name: 'companyId',
    type: 'string',
    description: 'Company ID to export data for',
  })
  @ApiParam({
    name: 'userId',
    type: 'string',
    description: 'User ID to export data for',
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
  @Header('Content-Type', 'application/json')
  @Header(
    'Content-Disposition',
    'attachment; filename=company_user_quiz_attempts.json',
  )
  public async exportQuizAttemptsByCompanyUserToJSON(
    @Param('companyId') companyId: string,
    @Param('userId') userId: string,
  ): Promise<StreamableFile> {
    const jsonData: string =
      await this.quizAttemptService.exportQuizAttemptsByCompanyUser(
        companyId,
        userId,
        ExportType.JSON,
      );
    if (!jsonData) {
      throw new NotFoundException('No quiz attempts found for the company.');
    }
    const stream: Readable = Readable.from([jsonData]);
    return new StreamableFile(stream);
  }

  @Get('export/json/company-quiz/:companyId/:quizId')
  @ApiOperation({
    summary: 'Export quiz attempts as JSON',
    description: 'Exports all quiz attempts for a company in JSON format.',
  })
  @ApiParam({
    name: 'companyId',
    type: 'string',
    description: 'Company ID to export data for',
  })
  @ApiParam({
    name: 'quizId',
    type: 'string',
    description: 'Quiz ID to export data for',
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
  @Header('Content-Type', 'application/json')
  @Header(
    'Content-Disposition',
    'attachment; filename=company_quiz_quiz_attempts.json',
  )
  public async exportQuizAttemptsByCompanyQuizToJSON(
    @Param('companyId') companyId: string,
    @Param('quizId') quizId: string,
  ): Promise<StreamableFile> {
    const jsonData: string =
      await this.quizAttemptService.exportQuizAttemptsByCompanyQuiz(
        companyId,
        quizId,
        ExportType.JSON,
      );
    if (!jsonData) {
      throw new NotFoundException('No quiz attempts found for the company.');
    }
    const stream: Readable = Readable.from([jsonData]);
    return new StreamableFile(stream);
  }

  @Get('export/csv/user')
  @ApiOperation({
    summary: 'Export quiz attempts as CSV',
    description: 'Exports all quiz attempts for user in CSV format.',
  })
  @ApiProduces('text/csv')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful CSV export',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No quiz attempts found for user',
  })
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename=user_quiz_attempts.csv')
  async exportQuizAttemptsByUserToCSV(
    @GetUserEmail() email: string,
  ): Promise<StreamableFile> {
    const csvData: string =
      await this.quizAttemptService.exportQuizAttemptsByUser(
        email,
        ExportType.CSV,
      );
    if (!csvData) {
      throw new NotFoundException('No quiz attempts found for user.');
    }
    const stream: Readable = Readable.from([csvData]);
    return new StreamableFile(stream);
  }

  @Get('export/csv/company/:companyId')
  @ApiOperation({
    summary: 'Export quiz attempts as CSV',
    description: 'Exports all quiz attempts for a company in CSV format.',
  })
  @ApiParam({
    name: 'companyId',
    type: 'string',
    description: 'Company ID to export data for',
  })
  @ApiProduces('text/csv')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful CSV export',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No quiz attempts found for the company',
  })
  @Roles(RoleEnum.ADMIN, RoleEnum.OWNER)
  @UseGuards(RoleGuard)
  @Header('Content-Type', 'text/csv')
  @Header(
    'Content-Disposition',
    'attachment; filename=company_quiz_attempts.csv',
  )
  async exportQuizAttemptsByCompanyToCSV(
    @Param('companyId') companyId: string,
  ): Promise<StreamableFile> {
    const csvData: string =
      await this.quizAttemptService.exportQuizAttemptsByCompany(
        companyId,
        ExportType.CSV,
      );
    if (!csvData) {
      throw new NotFoundException('No quiz attempts found for the company.');
    }
    const stream: Readable = Readable.from([csvData]);
    return new StreamableFile(stream);
  }

  @Get('export/csv/company-user/:companyId/:userId')
  @ApiOperation({
    summary: 'Export quiz attempts as CSV',
    description: 'Exports all quiz attempts for a company in CSV format.',
  })
  @ApiParam({
    name: 'companyId',
    type: 'string',
    description: 'Company ID to export data for',
  })
  @ApiParam({
    name: 'userId',
    type: 'string',
    description: 'User ID to export data for',
  })
  @ApiProduces('text/csv')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful CSV export',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No quiz attempts found for the company',
  })
  @Roles(RoleEnum.ADMIN, RoleEnum.OWNER)
  @UseGuards(RoleGuard)
  @Header('Content-Type', 'text/csv')
  @Header(
    'Content-Disposition',
    'attachment; filename=company_user_quiz_attempts.csv',
  )
  async exportQuizAttemptsByCompanyUserToCSV(
    @Param('companyId') companyId: string,
    @Param('userId') userId: string,
  ): Promise<StreamableFile> {
    const csvData: string =
      await this.quizAttemptService.exportQuizAttemptsByCompanyUser(
        companyId,
        userId,
        ExportType.CSV,
      );
    if (!csvData) {
      throw new NotFoundException('No quiz attempts found for the company.');
    }
    const stream: Readable = Readable.from([csvData]);
    return new StreamableFile(stream);
  }

  @Get('export/csv/company-quiz/:companyId/:quizId')
  @ApiOperation({
    summary: 'Export quiz attempts as CSV',
    description: 'Exports all quiz attempts for a company in CSV format.',
  })
  @ApiParam({
    name: 'companyId',
    type: 'string',
    description: 'Company ID to export data for',
  })
  @ApiParam({
    name: 'quizId',
    type: 'string',
    description: 'Quiz ID to export data for',
  })
  @ApiProduces('text/csv')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful CSV export',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No quiz attempts found for the company',
  })
  @Roles(RoleEnum.ADMIN, RoleEnum.OWNER)
  @UseGuards(RoleGuard)
  @Header('Content-Type', 'text/csv')
  @Header(
    'Content-Disposition',
    'attachment; filename=company_quiz_quiz_attempts.csv',
  )
  async exportQuizAttemptsByCompanyQuizToCSV(
    @Param('companyId') companyId: string,
    @Param('quizId') quizId: string,
  ): Promise<StreamableFile> {
    const csvData: string =
      await this.quizAttemptService.exportQuizAttemptsByCompanyQuiz(
        companyId,
        quizId,
        ExportType.CSV,
      );
    if (!csvData) {
      throw new NotFoundException('No quiz attempts found for the company.');
    }
    const stream: Readable = Readable.from([csvData]);
    return new StreamableFile(stream);
  }
}
