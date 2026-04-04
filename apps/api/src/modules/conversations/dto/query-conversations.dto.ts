import { ConversationEntityType } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";

import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import { IsLooseUuid } from "../../../common/decorators/is-loose-uuid.decorator";

export class QueryConversationsDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  unread?: boolean;
}

export class QueryByEntityDto {
  @IsEnum(ConversationEntityType)
  entity_type!: ConversationEntityType;

  @IsLooseUuid()
  entity_id!: string;
}
