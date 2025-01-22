import {Column, Entity, OneToMany, PrimaryGeneratedColumn} from "typeorm";
import {User} from "./user.entity";

@Entity()
export class Role {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column("varchar", { length: 200, unique: true })
    roleName: string;

    @OneToMany(() => User, (user) => user.role)
    user: User;
}