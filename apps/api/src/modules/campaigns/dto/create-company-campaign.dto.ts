import { OmitType } from "@nestjs/mapped-types";

import { CreateCampaignDto } from "./create-campaign.dto";

export class CreateCompanyCampaignDto extends OmitType(CreateCampaignDto, [
  "company_id",
] as const) {}
