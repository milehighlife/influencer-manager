import { OmitType } from "@nestjs/mapped-types";

import { CreatePerformanceSnapshotDto } from "./create-performance-snapshot.dto";

export class CreatePostPerformanceSnapshotDto extends OmitType(
  CreatePerformanceSnapshotDto,
  ["post_id"] as const,
) {}
