import {
  Controller,
  Get,
  Param,
  UseGuards,
  HttpStatus,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { GetUserEmail } from '../global/decorators/get-user-email.decorator';
import { Roles } from '../global/decorators/roles.decorator';
import { RoleEnum } from '../global/enums/role.enum';
import { RoleGuard } from '../role/guards/role.guard';
import { QuizScore } from '../global/interfaces/quiz-score.interface';
import { UserQuizScore } from '../global/interfaces/user-score.interface';
import { UserLastAttempt } from '../global/interfaces/user-last-attempt.interface';
import { CompanyUsersWithScore } from '../global/interfaces/company-users-with-score.interface';
import { QuizWithLastDate } from '../global/interfaces/quiz-with-last-date.interface';
import { UsersQuizzesWithScore } from '../global/interfaces/users-quizzes-with-score.interface';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(AuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('user/quiz-scores')
  @ApiOperation({
    summary: 'Get list of average scores for each quiz with time dynamics',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the list of average score',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request.',
  })
  public async getUserQuizScores(
    @GetUserEmail() email: string,
  ): Promise<UsersQuizzesWithScore[]> {
    return this.analyticsService.getUserQuizScores(email);
  }

  @Get('user/company-score/:companyId')
  @ApiOperation({
    summary: 'Get user score for company',
  })
  @ApiParam({
    name: 'companyId',
    type: 'string',
    description: 'Company Id',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the average score',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request.',
  })
  public async getUserQuizCompanyScore(
    @Param('companyId') companyId: string,
    @GetUserEmail() email: string,
  ): Promise<QuizScore> {
    return this.analyticsService.getUserQuizCompanyScore(companyId, email);
  }

  @Get('user/quiz-with-time')
  @ApiOperation({
    summary: 'Get list of quizzes and last completion time',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the list of quizzes',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request.',
  })
  public async getUserLastAttempts(
    @GetUserEmail() email: string,
  ): Promise<QuizWithLastDate[]> {
    return this.analyticsService.getUserLastAttempts(email);
  }

  @Get('company/user-scores/:companyId')
  @ApiOperation({
    summary:
      'Get list of average scores for all users in a company with time dynamics',
  })
  @ApiParam({
    name: 'companyId',
    type: 'string',
    description: 'Company Id',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the list of average scores',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request.',
  })
  @Roles(RoleEnum.ADMIN, RoleEnum.OWNER)
  @UseGuards(RoleGuard)
  public async getCompanyUserScores(
    @Param('companyId') companyId: string,
  ): Promise<UserQuizScore[]> {
    return this.analyticsService.getCompanyUserScores(companyId);
  }

  @Get('company/quiz-scores/:companyId')
  @ApiOperation({
    summary:
      'Get list of average scores for all quizzes in company of a selected user with time dynamics',
  })
  @ApiParam({
    name: 'companyId',
    type: 'string',
    description: 'Company Id',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the list of average scores',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request.',
  })
  @Roles(RoleEnum.ADMIN, RoleEnum.OWNER)
  @UseGuards(RoleGuard)
  public async getUserQuizScoresInCompany(
    @Param('companyId') companyId: string,
  ): Promise<CompanyUsersWithScore[]> {
    return this.analyticsService.getUserQuizScoresInCompany(companyId);
  }

  @Get('company/users-last-attempts/:companyId')
  @ApiOperation({
    summary: 'Get list of company users and their last test completion time',
  })
  @ApiParam({
    name: 'companyId',
    type: 'string',
    description: 'Company Id',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the list of company users',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request.',
  })
  @Roles(RoleEnum.ADMIN, RoleEnum.OWNER)
  @UseGuards(RoleGuard)
  public async getCompanyUsersLastAttempts(
    @Param('companyId') companyId: string,
  ): Promise<UserLastAttempt[]> {
    return this.analyticsService.getCompanyUsersLastAttempts(companyId);
  }
}
