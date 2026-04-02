import { OmitType } from "@nestjs/mapped-types";

import { CreateMissionDto } from "./create-mission.dto";

export class CreateCampaignMissionDto extends OmitType(CreateMissionDto, [
  "campaign_id",
] as const) {}
