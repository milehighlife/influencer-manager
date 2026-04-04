import { ClientStatus } from "@prisma/client";
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateClientDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  industry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  primary_contact_first_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  primary_contact_name?: string;

  @IsOptional()
  @IsEmail()
  primary_contact_email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  primary_contact_phone?: string;

  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;
}
