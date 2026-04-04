import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, ValidateNested } from "class-validator";
import { IsLooseUuid } from "../../../common/decorators/is-loose-uuid.decorator";

class BulkAssignmentItem {
  @IsLooseUuid()
  action_id!: string;

  @IsLooseUuid()
  influencer_id!: string;
}

export class BulkCreateAssignmentsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkAssignmentItem)
  assignments!: BulkAssignmentItem[];
}
