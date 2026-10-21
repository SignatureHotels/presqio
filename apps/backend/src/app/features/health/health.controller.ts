import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../../common/auth/auth.decorators";
import type { HealthResponse, ReadinessResponse } from "@presqio/lib";
import { HealthService } from "./health.service";
@ApiTags("Health")
@Public()
@Controller("health")
export class HealthController {
  constructor(private readonly health: HealthService) {}
  @Get() live(): HealthResponse {
    return this.health.live();
  }
  @Get("ready") ready(): Promise<ReadinessResponse> {
    return this.health.ready();
  }
}
