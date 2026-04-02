import { PartialType } from "@nestjs/mapped-types";

import { CreatePerformanceSnapshotDto } from "./create-performance-snapshot.dto";

export class UpdatePerformanceSnapshotDto extends PartialType(
  CreatePerformanceSnapshotDto,
) {}
