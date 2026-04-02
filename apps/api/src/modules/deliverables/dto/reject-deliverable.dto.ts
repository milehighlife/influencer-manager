import { IsString, MinLength } from "class-validator";

export class RejectDeliverableDto {
  @IsString()
  @MinLength(1)
  reason!: string;
}
