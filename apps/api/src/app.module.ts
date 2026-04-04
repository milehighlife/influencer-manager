import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";

import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "./common/guards/organization-context.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { PrismaModule } from "./database/prisma.module";
import { ActionAssignmentsModule } from "./modules/action-assignments/action-assignments.module";
import { ActionsModule } from "./modules/actions/actions.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CampaignsModule } from "./modules/campaigns/campaigns.module";
import { ClientsModule } from "./modules/clients/clients.module";
import { CompaniesModule } from "./modules/companies/companies.module";
import { ConversationsModule } from "./modules/conversations/conversations.module";
import { DeliverablesModule } from "./modules/deliverables/deliverables.module";
import { HealthModule } from "./modules/health/health.module";
import { InfluencerNotesModule } from "./modules/influencer-notes/influencer-notes.module";
import { InfluencerRatingsModule } from "./modules/influencer-ratings/influencer-ratings.module";
import { MessageTemplatesModule } from "./modules/message-templates/message-templates.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { InfluencerWorkspaceModule } from "./modules/influencer-workspace/influencer-workspace.module";
import { InfluencersModule } from "./modules/influencers/influencers.module";
import { JobsModule } from "./jobs/jobs.module";
import { MissionsModule } from "./modules/missions/missions.module";
import { OrganizationsModule } from "./modules/organizations/organizations.module";
import { PerformanceSnapshotsModule } from "./modules/performance-snapshots/performance-snapshots.module";
import { PostsModule } from "./modules/posts/posts.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { UsersModule } from "./modules/users/users.module";

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: "short",
        ttl: 1000,
        limit: 3,
      },
      {
        name: "medium",
        ttl: 10000,
        limit: 20,
      },
      {
        name: "long",
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    AuthModule,
    HealthModule,
    OrganizationsModule,
    UsersModule,
    ClientsModule,
    CompaniesModule,
    ConversationsModule,
    CampaignsModule,
    MissionsModule,
    ActionsModule,
    InfluencersModule,
    InfluencerWorkspaceModule,
    ActionAssignmentsModule,
    DeliverablesModule,
    PostsModule,
    PerformanceSnapshotsModule,
    ReportsModule,
    JobsModule,
    InfluencerRatingsModule,
    InfluencerNotesModule,
    MessageTemplatesModule,
    NotificationsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: OrganizationContextGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
