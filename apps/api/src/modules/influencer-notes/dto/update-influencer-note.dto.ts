import { PartialType } from "@nestjs/mapped-types";

import { CreateInfluencerNoteDto } from "./create-influencer-note.dto";

export class UpdateInfluencerNoteDto extends PartialType(
  CreateInfluencerNoteDto,
) {}
