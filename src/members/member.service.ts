import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UpdateMemberRoleDto } from './dto/update-member.dto';
import { Member } from './entities/member.entity';
import { Role } from '../role/entities/role.entity';
import { AppService } from '../app.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResultMessage } from '../global/interfaces/result-message';
import { RoleService } from '../role/role.service';
import { RoleEnum } from '../global/enums/role.enum';

@Injectable()
export class MemberService {
  private readonly logger: Logger = new Logger(AppService.name);

  constructor(
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    private roleService: RoleService,
  ) {}

  public async changeRoleFromMember(
    memberId: string,
    updateMemberDto: UpdateMemberRoleDto,
  ): Promise<ResultMessage> {
    const member: Member = await this.getMemberById(memberId);
    member.role = await this.roleService.getRoleById(updateMemberDto.roleId);
    this.logger.log('Saving the updated member to the database.');
    try {
      await this.memberRepository.save(member);
      this.logger.log(`Successfully updated member.`);
      return { message: "Successfully accepted member's role." };
    } catch (error) {
      this.logger.error(`Failed to accept member`, error.stack);
    }
  }

  public async removeMember(memberId: string): Promise<ResultMessage> {
    const member: Member = await this.getMemberById(memberId);
    this.logger.log(`Deleting member with ID ${memberId}.`);
    try {
      await this.memberRepository.remove(member);
      this.logger.log('Successfully removed member from the database.');
      return {
        message: `The member was successfully deleted.`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to remove member from the database`,
        error.stack,
      );
    }
  }

  public async getMemberById(memberId: string): Promise<Member> {
    const member: Member = await this.memberRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.company', 'company')
      .leftJoinAndSelect('member.user', 'user')
      .leftJoinAndSelect('member.role', 'role')
      .where('member.id = :memberId', { memberId: memberId })
      .getOne();
    if (!member) {
      this.logger.error('Member not found.');
      throw new NotFoundException(`Member not found.`);
    } else {
      return member;
    }
  }

  public async createMember(
    companyId: string,
    userId: string,
    role?: string,
  ): Promise<Member> {
    this.logger.log('Attempting to create a new member.');
    const memberRole: Role = await this.getMemberRole(role);
    const newMember: Member = this.memberRepository.create({
      company: { id: companyId },
      user: { id: userId },
      role: memberRole,
    });
    this.logger.log('Saving the new member to the database.');
    try {
      this.logger.log('Successfully created new member.');
      return await this.memberRepository.save(newMember);
    } catch (error) {
      this.logger.error('Error while saving request', error.stack);
      throw new InternalServerErrorException(`Creating member fail.`);
    }
  }

  private async getMemberRole(role?: string): Promise<Role> {
    const memberRole: Role = await this.roleRepository.findOne({
      where: {
        roleName: role ? role : RoleEnum.MEMBER,
      },
    });
    if (!memberRole) {
      this.logger.error('Member role not found.');
      throw new NotFoundException(`Member role not found.`);
    }
    return memberRole;
  }

  public async checkUserMemberById(
    userId: string,
    companyId: string,
  ): Promise<boolean> {
    return await this.memberRepository
      .createQueryBuilder('member')
      .innerJoin('member.user', 'user')
      .innerJoin('member.company', 'company')
      .where('company.id = :companyId', { companyId: companyId })
      .andWhere('user.id = :id', { id: userId })
      .getExists();
  }
}
