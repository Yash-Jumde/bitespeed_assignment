import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

export enum LinkPrecedence {
  PRIMARY = "primary",
  SECONDARY = "secondary"
}

@Entity({ name: "contacts" })
export class Contact {
@PrimaryGeneratedColumn()
id: number;

@Column({ type: "varchar", nullable: true })
phoneNumber: string | null;

@Column({ type: "varchar", nullable: true })
email: string | null;

@Column({ type: "int", nullable: true })
linkedId: number | null;

@Column({
type: "enum",
enum: LinkPrecedence,
default: LinkPrecedence.PRIMARY
})
linkPrecedence: LinkPrecedence;

@CreateDateColumn()
createdAt: Date;

@UpdateDateColumn()
updatedAt: Date;

@Column({ type: "timestamp", nullable: true })
deletedAt: Date | null;
}

// Define the request and response interfaces
export interface IdentifyRequest {
  email?: string | null;
  phoneNumber?: string | null;
}

export interface IdentifyResponse {
  contact: {
    primaryContactId: number;
    emails: string[];
    phoneNumbers: string[];
    secondaryContactIds: number[];
  };
}