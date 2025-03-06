import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpStatus,
  UseInterceptors,
  ClassSerializerInterceptor,
  Query,
} from '@nestjs/common';
import { QuizService } from './quiz.service';
import { QuizDto } from './dto/quiz.dto';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { RoleGuard } from '../role/guards/role.guard';
import { Roles } from '../global/decorators/roles.decorator';
import { RoleEnum } from '../global/enums/role.enum';
import { ResultMessage } from '../global/interfaces/result-message';
import { Quiz } from './entities/quiz.entity';
import { PaginationOptionsDto } from '../global/dto/pagination-options.dto';
import { PaginationDto } from '../global/dto/pagination.dto';
import { GetUserEmail } from '../global/decorators/get-user-email.decorator';
import { QuizStartResult } from '../global/interfaces/quiz-start-result.interface';

@ApiTags('Quizzes')
@Controller('quizzes')
@UseGuards(AuthGuard)
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Post(':companyId')
  @ApiOperation({
    summary: 'Create a new quiz.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The quiz has been successfully created.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request.',
  })
  @Roles(RoleEnum.OWNER, RoleEnum.ADMIN)
  @UseGuards(RoleGuard)
  public async createNewQuiz(
    @Body() createQuizDto: QuizDto,
    @Param('companyId') companyId: string,
  ): Promise<ResultMessage> {
    return this.quizService.createNewQuiz(createQuizDto, companyId);
  }

  @Get('company/:companyId')
  @ApiOperation({ summary: 'Get quiz for company by company id.' })
  @ApiParam({
    name: 'companyId',
    description: 'The ID of the quiz to get.',
    example: 'e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The list of quizzes.',
    type: Quiz,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Company not found.',
  })
  @UseInterceptors(ClassSerializerInterceptor)
  @Roles(RoleEnum.ADMIN, RoleEnum.OWNER, RoleEnum.MEMBER)
  @UseGuards(RoleGuard)
  public async getQuizzesForCompanyById(
    @Param('companyId') companyId: string,
    @Query() pageOptionsDto: PaginationOptionsDto,
  ): Promise<PaginationDto<Quiz>> {
    return this.quizService.getQuizzesForCompanyById(companyId, pageOptionsDto);
  }

  @Get('start/:quizId')
  @ApiOperation({ summary: 'Get quiz by id for starting quiz.' })
  @ApiParam({
    name: 'quizId',
    description: 'The ID of the quiz to get.',
    example: 'e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The quiz with the specified ID without correct answer flags.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Quiz not found.',
  })
  @UseInterceptors(ClassSerializerInterceptor)
  @Roles(RoleEnum.ADMIN, RoleEnum.OWNER, RoleEnum.MEMBER)
  @UseGuards(RoleGuard)
  public async getQuizByIdForStart(
    @Param('quizId') quizId: string,
    @GetUserEmail() userEmail: string,
  ): Promise<QuizStartResult> {
    return this.quizService.getQuizByIdForStart(quizId, userEmail);
  }

  @Get(':quizId')
  @ApiOperation({ summary: 'Get quiz by id.' })
  @ApiParam({
    name: 'quizId',
    description: 'The ID of the quiz to get.',
    example: 'e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The quiz with the specified ID.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Quiz not found.',
  })
  @UseInterceptors(ClassSerializerInterceptor)
  @Roles(RoleEnum.ADMIN, RoleEnum.OWNER)
  @UseGuards(RoleGuard)
  public async getQuizById(@Param('quizId') quizId: string): Promise<Quiz> {
    return this.quizService.getQuizById(quizId);
  }

  @Patch(':quizId')
  @ApiOperation({ summary: 'Update quiz.' })
  @ApiParam({
    name: 'quizId',
    description: 'The ID of the quiz to update.',
    example: 'e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The quiz has been successfully updated.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Quiz not found.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request.',
  })
  @Roles(RoleEnum.ADMIN, RoleEnum.OWNER)
  @UseGuards(RoleGuard)
  public async updateQuizById(
    @Param('quizId') quizId: string,
    @Body() updateQuizDto: QuizDto,
  ): Promise<ResultMessage> {
    return this.quizService.updateQuizById(quizId, updateQuizDto);
  }

  @Delete(':quizId')
  @ApiOperation({ summary: 'Delete the quiz by id.' })
  @ApiParam({
    name: 'quizId',
    description: 'The ID of the quiz to delete.',
    example: 'e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The quiz has been successfully deleted.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Quiz not found.',
  })
  @Roles(RoleEnum.ADMIN, RoleEnum.OWNER)
  @UseGuards(RoleGuard)
  public async removeQuizById(
    @Param('quizId') quizId: string,
  ): Promise<ResultMessage> {
    return this.quizService.removeQuizById(quizId);
  }
}
