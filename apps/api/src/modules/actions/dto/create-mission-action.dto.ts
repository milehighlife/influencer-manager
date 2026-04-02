import { OmitType } from "@nestjs/mapped-types";

import { CreateActionDto } from "./create-action.dto";

export class CreateMissionActionDto extends OmitType(CreateActionDto, [
  "mission_id",
] as const) {}
