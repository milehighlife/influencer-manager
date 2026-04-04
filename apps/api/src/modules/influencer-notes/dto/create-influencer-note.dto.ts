import { IsString, MaxLength } from "class-validator";

import { IsLooseUuid } from "../../../common/decorators/is-loose-uuid.decorator";

export class CreateInfluencerNoteDto {
  @IsLooseUuid()
  influencer_id!: string;

  @IsLooseUuid()
  author_user_id!: string;

  @IsString()
  @MaxLength(5000)
  note_text!: string;
}
