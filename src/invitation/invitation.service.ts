import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { ResultMessage } from '../global/interfaces/result-message';
import { AppService } from '../app.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Invitation } from './entities/invitation.entity';
import { PaginationOptionsDto } from '../global/dto/pagination-options.dto';
import { PaginationDto } from '../global/dto/pagination.dto';
import { PaginationMetaDto } from '../global/dto/pagination-meta.dto';
import { InviteRequestStatus } from '../global/enums/invite-request-status.enum';
import { MemberService } from '../members/member.service';
import { Request } from '../request/entities/request.entity';

@Injectable()
export class InvitationService {
  private readonly logger: Logger = new Logger(AppService.name);

  constructor(
    @InjectRepository(Invitation)
    private invitationRepository: Repository<Invitation>,
    @InjectRepository(Request)
    private requestRepository: Repository<Request>,
    private memberService: MemberService,
  ) {}
  public async createInvite(
    createInvitationDto: CreateInvitationDto,
  ): Promise<ResultMessage> {
    this.logger.log('Attempting to create a new invite.');
    const userIsMember: boolean = await this.memberService.checkUserMemberById(
      createInvitationDto.invitedUserId,
      createInvitationDto.companyId,
    );
    if (userIsMember) {
      this.logger.error('User already in company.');
      throw new ForbiddenException('This user already in company');
    }
    const existInvite: Invitation = await this.invitationRepository.findOne({
      where: {
        company: { id: createInvitationDto.companyId },
        invitedUser: { id: createInvitationDto.invitedUserId },
        status: InviteRequestStatus.PENDING,
      },
    });
    if (existInvite) {
      this.logger.error('User already have invite.');
      throw new ForbiddenException('User already have invite');
    }
    const newInvitation: Invitation = this.invitationRepository.create({
      company: { id: createInvitationDto.companyId },
      invitedUser: { id: createInvitationDto.invitedUserId },
      invitedBy: { id: createInvitationDto.userId },
    });
    this.logger.log('Saving the new invite to the database.');
    try {
      await this.invitationRepository.save(newInvitation);
      this.logger.log('Successfully created new invite.');
      return { message: 'The invite has been created.' };
    } catch (error) {
      this.logger.error('Error while saving invite', error.stack);
    }
  }

  public async getAllUsersInvites(
    pageOptionsDto: PaginationOptionsDto,
    email: string,
  ): Promise<PaginationDto<Invitation>> {
    const queryBuilder: SelectQueryBuilder<Invitation> =
      this.invitationRepository.createQueryBuilder('invitation');
    queryBuilder
      .leftJoinAndSelect('invitation.company', 'company')
      .leftJoinAndSelect('invitation.invitedUser', 'invitedUser')
      .leftJoinAndSelect('invitation.invitedBy', 'invitedBy')
      .where('invitedUser.emailLogin = :email', { email: email })
      .andWhere('invitation.status = :status', {
        status: InviteRequestStatus.PENDING,
      })
      .orderBy('invitation.createdAt', pageOptionsDto.order)
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

  public async acceptInvite(inviteId: string): Promise<ResultMessage> {
    this.logger.log('Attempting to accept invitation.');
    const invite: Invitation = await this.getInviteById(inviteId);
    const userIsMember: boolean = await this.memberService.checkUserMemberById(
      invite.invitedUser.id,
      invite.company.id,
    );
    if (userIsMember) {
      this.logger.error('User already in company.');
      throw new ForbiddenException('You already in company');
    }
    invite.status = InviteRequestStatus.ACCEPTED;
    this.logger.log('Check the same request. ');
    const request: Request = await this.requestRepository.findOne({
      where: {
        company: { id: invite.company.id },
        requestedUser: { id: invite.invitedUser.id },
        status: InviteRequestStatus.PENDING,
      },
    });
    if (request) {
      this.logger.log("User's request find, accept it. ");
      request.status = InviteRequestStatus.ACCEPTED;
    }
    this.logger.log('Saving the updated invitation to the database.');
    try {
      await this.invitationRepository.save(invite);
      if (request) await this.requestRepository.save(request);
      this.logger.log(`Successfully updated invitation.`);
      await this.memberService.createMember(
        invite.company.id,
        invite.invitedUser.id,
      );
      return { message: 'Successfully accepted invitation.' };
    } catch (error) {
      this.logger.error(
        `Failed to accept invitation with ID ${inviteId}`,
        error.stack,
      );
    }
  }

  public async declineInvitation(inviteId: string): Promise<ResultMessage> {
    this.logger.log('Attempting to decline invitation.');
    const invite: Invitation = await this.getInviteById(inviteId);
    invite.status = InviteRequestStatus.DECLINED;
    this.logger.log('Saving the updated invitation to the database.');
    try {
      await this.invitationRepository.save(invite);
      this.logger.log(`Successfully decline invitation.`);
      return { message: 'Successfully decline invitation.' };
    } catch (error) {
      this.logger.error(
        `Failed to decline invitation with ID ${inviteId}`,
        error.stack,
      );
    }
  }

  public async getInviteById(inviteId: string): Promise<Invitation> {
    const invite: Invitation = await this.invitationRepository.findOne({
      where: {
        id: inviteId,
      },
      relations: {
        company: true,
        invitedUser: true,
        invitedBy: true,
      },
    });
    if (!invite) {
      this.logger.error('Invitation not found.');
      throw new NotFoundException(`Invitation not found.`);
    }
    return invite;
  }
}
