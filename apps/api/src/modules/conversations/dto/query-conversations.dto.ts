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

  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  needs_reply?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  sent_by_me?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  show_batches?: boolean;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  related_entity_type?: string;

  @IsOptional()
  @IsLooseUuid()
  related_entity_id?: string;

  @IsOptional()
  @IsLooseUuid()
  influencer_id?: string;
}

export class QueryByEntityDto {
  @IsEnum(ConversationEntityType)
  entity_type!: ConversationEntityType;

  @IsLooseUuid()
  entity_id!: string;
}
