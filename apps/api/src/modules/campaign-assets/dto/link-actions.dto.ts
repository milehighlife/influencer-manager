import { IsArray } from "class-validator";
import { IsLooseUuid } from "../../../common/decorators/is-loose-uuid.decorator";

export class LinkActionsDto {
  @IsArray()
  @IsLooseUuid({ each: true })
  action_ids!: string[];
}
