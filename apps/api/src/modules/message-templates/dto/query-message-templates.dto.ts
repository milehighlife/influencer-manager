import { MessageTemplateCategory } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class QueryMessageTemplatesDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(MessageTemplateCategory)
  category?: MessageTemplateCategory;
}
