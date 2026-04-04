import { MessageTemplateCategory } from "@prisma/client";
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateMessageTemplateDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsString()
  @MaxLength(500)
  subject!: string;

  @IsString()
  body!: string;

  @IsOptional()
  @IsEnum(MessageTemplateCategory)
  category?: MessageTemplateCategory;

  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}
