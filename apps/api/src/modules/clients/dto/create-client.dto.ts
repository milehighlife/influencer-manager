import { ClientStatus } from "@prisma/client";
import { IsEmail, IsEnum, IsOptional, IsString } from "class-validator";

export class CreateClientDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  primary_contact_name?: string;

  @IsOptional()
  @IsEmail()
  primary_contact_email?: string;

  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;
}
