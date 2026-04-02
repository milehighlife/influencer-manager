import { Module } from "@nestjs/common";

import { ActionAssignmentsController } from "./action-assignments.controller";
import { ActionAssignmentsService } from "./action-assignments.service";

@Module({
  controllers: [ActionAssignmentsController],
  providers: [ActionAssignmentsService],
  exports: [ActionAssignmentsService],
})
export class ActionAssignmentsModule {}
