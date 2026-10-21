import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaClient } from "@prisma/client";
@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleDestroy {
  constructor(config: ConfigService) {
    super({
      datasources: { db: { url: config.getOrThrow<string>("DATABASE_URL") } },
      // The database is remote (Neon), so a multi-step transaction such as registration makes
      // several network round trips; Prisma's 5 s default is too tight for that.
      transactionOptions: { maxWait: 10_000, timeout: 20_000 },
    });
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
