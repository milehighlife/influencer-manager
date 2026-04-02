import { Module } from "@nestjs/common";

import { ImportLogsService } from "./import-logs.service";

@Module({
  providers: [ImportLogsService],
  exports: [ImportLogsService],
})
export class ImportLogsModule {}
