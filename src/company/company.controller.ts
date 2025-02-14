import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
  UploadedFile,
  Query,
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
import { ParseJsonPipe } from '../global/pipes/parse-json.pipe';
import { PaginationOptionsDto } from '../global/dto/pagination-options.dto';
import { PaginationDto } from '../global/dto/pagination.dto';
import { UpdateCompanyVisibilityDto } from './dto/update-company-visibility.dto';

@ApiTags('Company')
@Controller('company')
@UseGuards(AuthGuard)
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

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
  public create(
    @Body() createCompanyDto: CreateCompanyDto,
    @GetUserEmail() email: string,
  ): Promise<void> {
    return this.companyService.createNewCompany(createCompanyDto, email);
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
  public findOne(
    @Param('id') id: string,
    @GetUserEmail() email: string,
  ): Promise<Company> {
    return this.companyService.getCompanyById(id, email);
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
  public update(
    @Param('id') id: string,
    @GetUserEmail() email: string,
    @Body('companyData', new ParseJsonPipe(UpdateCompanyDto))
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

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
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
    @GetUserEmail() email: string,
    @Param('id') id: string,
  ): Promise<ResultMessage> {
    return this.companyService.removeCompanyById(email, id);
  }

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
}
