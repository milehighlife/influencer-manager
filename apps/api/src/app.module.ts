import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";

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
import { DeliverablesModule } from "./modules/deliverables/deliverables.module";
import { HealthModule } from "./modules/health/health.module";
import { InfluencerNotesModule } from "./modules/influencer-notes/influencer-notes.module";
import { InfluencerRatingsModule } from "./modules/influencer-ratings/influencer-ratings.module";
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
    PrismaModule,
    AuthModule,
    HealthModule,
    OrganizationsModule,
    UsersModule,
    ClientsModule,
    CompaniesModule,
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
  ],
})
export class AppModule {}
