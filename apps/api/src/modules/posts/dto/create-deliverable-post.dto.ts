import { OmitType } from "@nestjs/mapped-types";

import { CreatePostDto } from "./create-post.dto";

export class CreateDeliverablePostDto extends OmitType(CreatePostDto, [
  "deliverable_id",
] as const) {}
