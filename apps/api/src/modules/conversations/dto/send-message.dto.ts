import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

import { IsLooseUuid } from "../../../common/decorators/is-loose-uuid.decorator";

export class SendMessageDto {
  @IsString()
  @MaxLength(10000)
  body!: string;

  @IsOptional()
  @IsLooseUuid()
  template_id?: string;

  @IsOptional()
  @IsBoolean()
  sent_via_email?: boolean;
}
