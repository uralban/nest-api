import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
  UploadedFile,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { GetUserEmail } from '../global/decorators/get-user-email.decorator';
import { ResultMessage } from '../global/interfaces/result-message';
import { Company } from './entities/company.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import { ParseJsonPipeWithValidation } from '../global/pipes/parse-json-pipe-with-validation.service';
import { PaginationOptionsDto } from '../global/dto/pagination-options.dto';
import { PaginationDto } from '../global/dto/pagination.dto';
import { UpdateCompanyVisibilityDto } from './dto/update-company-visibility.dto';
import { RawBody } from '../global/decorators/raw-body.decorator';

@ApiTags('Company')
@Controller('company')
@UseGuards(AuthGuard)
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get('visibility-statuses')
  @ApiOperation({ summary: 'Get all visibility statuses.' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The list of visibility statuses.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request',
  })
  public getAllVisibilityStatuses(): string[] {
    return this.companyService.getAllVisibilityStatuses();
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new company.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The company has been successfully created.',
    type: Company,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request.',
  })
  @UseInterceptors(FileInterceptor('file'))
  public async createCompany(
    @GetUserEmail() email: string,
    @RawBody('companyData', new ParseJsonPipeWithValidation(CreateCompanyDto))
    createCompanyDto: CreateCompanyDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<void> {
    return this.companyService.createNewCompany(email, createCompanyDto, file);
  }

  @Get()
  @ApiOperation({ summary: 'Get all companies.' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The list of companies.',
    type: [Company],
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request',
  })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  )
  @UseInterceptors(ClassSerializerInterceptor)
  public async getAllCompanies(
    @Query() pageOptionsDto: PaginationOptionsDto,
    @GetUserEmail() email: string,
  ): Promise<PaginationDto<Company>> {
    return await this.companyService.getAllCompanies(pageOptionsDto, email);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get company by id.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the company to get.',
    example: 'e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The company with the specified ID.',
    type: Company,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Company not found.',
  })
  @UseInterceptors(ClassSerializerInterceptor)
  public getCompanyById(
    @Param('id') id: string,
    @GetUserEmail() email: string,
  ): Promise<Company> {
    return this.companyService.getCompanyById(id, email);
  }

  @Patch()
  @ApiOperation({ summary: "Update visibility status for all user's company." })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The visibility status has been successfully updated.',
    type: Company,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Company not found.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request.',
  })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  )
  @UseInterceptors(ClassSerializerInterceptor)
  public updateVisibilityStatusForAllUsersCompany(
    @GetUserEmail() email: string,
    @Body() updateCompanyVisibilityDto: UpdateCompanyVisibilityDto,
  ): Promise<ResultMessage> {
    return this.companyService.updateVisibilityStatusForAllUsersCompany(
      email,
      updateCompanyVisibilityDto,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing company.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the company to update.',
    example: 'e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The company has been successfully updated.',
    type: Company,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Company not found.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request.',
  })
  @UseInterceptors(FileInterceptor('file'))
  @UseInterceptors(ClassSerializerInterceptor)
  public updateCompanyById(
    @Param('id') id: string,
    @GetUserEmail() email: string,
    @RawBody('companyData', new ParseJsonPipeWithValidation(UpdateCompanyDto))
    updateCompanyDto: UpdateCompanyDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<Company> {
    return this.companyService.updateCompanyById(
      id,
      email,
      updateCompanyDto,
      file,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete the company by id.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the company to delete.',
    example: 'e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The company has been successfully deleted.',
    type: Company,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Company not found.',
  })
  public async removeCompanyById(
    @Param('id') id: string,
    @GetUserEmail() email: string,
  ): Promise<ResultMessage> {
    return this.companyService.removeCompanyById(id, email);
  }
}
