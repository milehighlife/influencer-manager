import { Type } from "class-transformer";
import {
  IsArray,
  IsInt,
  Min,
  ValidateNested,
} from "class-validator";
import { IsLooseUuid } from "../../../common/decorators/is-loose-uuid.decorator";

export class ReorderItemDto {
  @IsLooseUuid()
  id!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  sort_order!: number;
}

export class ReorderAssetsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  items!: ReorderItemDto[];
}
