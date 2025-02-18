import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateRequestDto } from './dto/create-request.dto';
import { ResultMessage } from '../global/interfaces/result-message';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Request } from './entities/request.entity';
import { AppService } from '../app.service';
import { InviteRequestStatus } from '../global/enums/invite-request-status.enum';
import { PaginationDto } from '../global/dto/pagination.dto';
import { PaginationOptionsDto } from '../global/dto/pagination-options.dto';
import { PaginationMetaDto } from '../global/dto/pagination-meta.dto';
import { MemberService } from '../members/member.service';
import { Invitation } from '../invitation/entities/invitation.entity';

@Injectable()
export class RequestService {
  private readonly logger: Logger = new Logger(AppService.name);

  constructor(
    @InjectRepository(Request)
    private requestRepository: Repository<Request>,
    @InjectRepository(Invitation)
    private invitationRepository: Repository<Invitation>,
    private memberService: MemberService,
  ) {}

  public async createRequest(
    createRequestDto: CreateRequestDto,
  ): Promise<ResultMessage> {
    this.logger.log('Attempting to create a new request.');
    const userIsMember: boolean = await this.memberService.checkUserMemberById(
      createRequestDto.userId,
      createRequestDto.companyId,
    );
    if (userIsMember) {
      this.logger.error('User already in company');
      throw new ForbiddenException('You already in company');
    }
    const duplicateRequest: Request = await this.requestRepository.findOne({
      where: {
        company: { id: createRequestDto.companyId },
        requestedUser: { id: createRequestDto.userId },
        status: InviteRequestStatus.PENDING,
      },
    });
    if (duplicateRequest) {
      this.logger.error('Request already exist');
      throw new ForbiddenException('Request already exist');
    }
    const newRequest: Request = this.requestRepository.create({
      company: { id: createRequestDto.companyId },
      requestedUser: { id: createRequestDto.userId },
    });
    this.logger.log('Saving the new request to the database.');
    try {
      await this.requestRepository.save(newRequest);
      this.logger.log('Successfully created new request.');
      return { message: 'The request has been created.' };
    } catch (error) {
      this.logger.error('Error while saving request', error.stack);
    }
  }

  public async getAllUsersRequests(
    pageOptionsDto: PaginationOptionsDto,
    email: string,
  ): Promise<PaginationDto<Request>> {
    const queryBuilder: SelectQueryBuilder<Request> =
      this.requestRepository.createQueryBuilder('request');
    queryBuilder
      .leftJoinAndSelect('request.company', 'company')
      .leftJoinAndSelect('request.requestedUser', 'requestedUser')
      .where('requestedUser.emailLogin = :email', { email: email })
      .andWhere('request.status = :status', {
        status: InviteRequestStatus.PENDING,
      })
      .orderBy('request.createdAt', pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(+pageOptionsDto.take);
    const itemCount: number = await queryBuilder.getCount();
    const { entities } = await queryBuilder.getRawAndEntities();
    const pageMetaDto: PaginationMetaDto = new PaginationMetaDto({
      paginationOptionsDto: pageOptionsDto,
      itemCount,
    });
    return new PaginationDto(entities, pageMetaDto);
  }

  public async acceptRequest(requestId: string): Promise<ResultMessage> {
    this.logger.log('Attempting to accept request.');
    const request: Request = await this.getRequestById(requestId);
    request.status = InviteRequestStatus.ACCEPTED;
    this.logger.log('Check the same invite. ');
    const invite: Invitation = await this.invitationRepository.findOne({
      where: {
        company: { id: request.company.id },
        invitedUser: { id: request.requestedUser.id },
        status: InviteRequestStatus.PENDING,
      },
    });
    if (invite) {
      this.logger.log("User's invite find, accept it. ");
      invite.status = InviteRequestStatus.ACCEPTED;
    }
    this.logger.log('Saving the updated request to the database.');
    try {
      await this.requestRepository.save(request);
      if (invite) await this.invitationRepository.save(invite);
      this.logger.log(`Successfully updated request.`);
      await this.memberService.createMember(
        request.company.id,
        request.requestedUser.id,
      );
      return { message: 'Successfully accepted request.' };
    } catch (error) {
      this.logger.error(
        `Failed to accept request with ID ${requestId}`,
        error.stack,
      );
    }
  }

  public async declineRequest(requestId: string): Promise<ResultMessage> {
    this.logger.log('Attempting to decline request.');
    const request: Request = await this.getRequestById(requestId);
    request.status = InviteRequestStatus.DECLINED;
    this.logger.log('Saving the updated request to the database.');
    try {
      await this.requestRepository.save(request);
      this.logger.log(`Successfully decline request.`);
      return { message: 'Successfully decline request.' };
    } catch (error) {
      this.logger.error(
        `Failed to decline request with ID ${requestId}`,
        error.stack,
      );
    }
  }

  public async getRequestById(requestId: string): Promise<Request> {
    const request: Request = await this.requestRepository.findOne({
      where: { id: requestId },
      relations: {
        company: true,
        requestedUser: true,
      },
    });
    if (!request) {
      this.logger.error('Request not found.');
      throw new NotFoundException(`Request not found.`);
    }
    return request;
  }
}
