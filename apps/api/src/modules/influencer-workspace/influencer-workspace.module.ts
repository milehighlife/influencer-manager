import { Module } from "@nestjs/common";

import { JobsModule } from "../../jobs/jobs.module";
import { ActionAssignmentsModule } from "../action-assignments/action-assignments.module";
import { PostsModule } from "../posts/posts.module";
import { ReportsModule } from "../reports/reports.module";
import { InfluencerMessagingService } from "./influencer-messaging.service";
import { InfluencerWorkspaceController } from "./influencer-workspace.controller";
import { InfluencerWorkspaceService } from "./influencer-workspace.service";

@Module({
  imports: [ActionAssignmentsModule, PostsModule, ReportsModule, JobsModule],
  controllers: [InfluencerWorkspaceController],
  providers: [InfluencerWorkspaceService, InfluencerMessagingService],
})
export class InfluencerWorkspaceModule {}
