import { IsString } from "class-validator";

import { IsLooseUuid } from "../../../common/decorators/is-loose-uuid.decorator";

export class CreateInfluencerNoteDto {
  @IsLooseUuid()
  influencer_id!: string;

  @IsLooseUuid()
  author_user_id!: string;

  @IsString()
  note_text!: string;
}
