import {
  DeliverableStatus,
  DeliverableType,
} from "@prisma/client";
import {
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
} from "class-validator";
import { IsLooseUuid } from "../../../common/decorators/is-loose-uuid.decorator";

export class CreateDeliverableDto {
  @IsLooseUuid()
  action_assignment_id!: string;

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

  @IsOptional()
  @IsString()
  rejection_reason?: string;

  @IsOptional()
  @IsEnum(DeliverableStatus)
  status?: DeliverableStatus;

  @IsOptional()
  @IsDateString()
  submitted_at?: string;

  @IsOptional()
  @IsDateString()
  approved_at?: string;
}
