import { CompanyStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

import { IsLooseUuid } from "../../../common/decorators/is-loose-uuid.decorator";

export class CreateCompanyDto {
  @IsLooseUuid()
  client_id!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(CompanyStatus)
  status?: CompanyStatus;
}
