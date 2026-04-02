import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { DeliverableType } from "@prisma/client";

class SubmitAssignmentDeliverableItemDto {
  @IsEnum(DeliverableType)
  deliverable_type!: DeliverableType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  submission_url?: string;

  @IsOptional()
  @IsObject()
  submission_metadata_json?: Record<string, unknown>;
}

export class SubmitActionAssignmentDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SubmitAssignmentDeliverableItemDto)
  deliverables!: SubmitAssignmentDeliverableItemDto[];
}
