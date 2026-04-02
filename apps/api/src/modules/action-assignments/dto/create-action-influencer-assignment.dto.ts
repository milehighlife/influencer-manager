import { OmitType } from "@nestjs/mapped-types";

import { CreateActionAssignmentDto } from "./create-action-assignment.dto";

export class CreateActionInfluencerAssignmentDto extends OmitType(
  CreateActionAssignmentDto,
  ["action_id"] as const,
) {}
