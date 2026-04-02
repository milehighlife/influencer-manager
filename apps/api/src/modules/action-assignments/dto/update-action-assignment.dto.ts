import { PartialType } from "@nestjs/mapped-types";

import { CreateActionAssignmentDto } from "./create-action-assignment.dto";

export class UpdateActionAssignmentDto extends PartialType(
  CreateActionAssignmentDto,
) {}
