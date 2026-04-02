import { Module } from "@nestjs/common";

import { JobsModule } from "../../jobs/jobs.module";
import { ReportsModule } from "../reports/reports.module";
import { PostsController } from "./posts.controller";
import { PostsService } from "./posts.service";

@Module({
  imports: [JobsModule, ReportsModule],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
