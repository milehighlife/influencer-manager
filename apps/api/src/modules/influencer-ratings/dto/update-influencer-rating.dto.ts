import { PartialType } from "@nestjs/mapped-types";

import { CreateInfluencerRatingDto } from "./create-influencer-rating.dto";

export class UpdateInfluencerRatingDto extends PartialType(
  CreateInfluencerRatingDto,
) {}
