import {Entity, PrimaryGeneratedColumn} from "typeorm";

@Entity()
export class BaseCustomEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;
}