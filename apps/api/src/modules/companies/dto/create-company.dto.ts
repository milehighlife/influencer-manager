import { CompanyStatus } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEmail, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

import { IsLooseUuid } from "../../../common/decorators/is-loose-uuid.decorator";

export class CreateCompanyDto {
  @IsLooseUuid()
  client_id!: string;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  contact_first_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  contact_last_name?: string;

  @IsOptional()
  @IsEmail()
  contact_email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  contact_phone?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10)
  priority_instagram?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10)
  priority_tiktok?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10)
  priority_youtube?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10)
  priority_facebook?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10)
  priority_x?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10)
  priority_linkedin?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10)
  priority_threads?: number;

  @IsOptional()
  priority_regions?: Record<string, string>;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  priorities_updated_at?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  priorities_updated_by?: string;

  @IsOptional()
  @IsEnum(CompanyStatus)
  status?: CompanyStatus;
}
