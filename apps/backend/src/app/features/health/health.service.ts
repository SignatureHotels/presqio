import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { HealthResponse, ReadinessResponse } from "@presqio/lib";
import { DatabaseService } from "../../common/database/database.service";
@Injectable()
export class HealthService {
  constructor(private readonly db: DatabaseService) {}
  live(): HealthResponse {
    return {
      status: "ok",
      service: "presqio-api",
      serverTime: new Date().toISOString(),
    };
  }
  async ready(): Promise<ReadinessResponse> {
    try {
      await this.db.$queryRaw`SELECT 1`;
      const tables = await this.db.$queryRaw<
        { name: string | null }[]
      >`SELECT to_regclass('public.attendance_sessions')::text AS name`;
      if (!tables[0]?.name) throw new Error("Schema missing");
      return { status: "ok", database: "connected", schema: "available" };
    } catch {
      throw new ServiceUnavailableException(
        "Database unavailable or migrations not applied",
      );
    }
  }
}
