import {
  Controller,
  Get,
  ServiceUnavailableException,
} from "@nestjs/common";

import { Public } from "../../common/decorators/public.decorator";
import { HealthService } from "./health.service";

@Public()
@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get("live")
  getLiveness() {
    return this.healthService.getLiveness();
  }

  @Get("ready")
  async getReadiness() {
    const readiness = await this.healthService.getReadiness();

    if (readiness.status !== "ok") {
      throw new ServiceUnavailableException(readiness);
    }

    return readiness;
  }
}
