import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { tenantExtension } from './tenant.extension';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Returns a Prisma client extended with tenant isolation.
   * Every query issued through the returned client is automatically scoped to
   * the given tenantId — reads are filtered, writes have tenantId injected.
   *
   * Usage in a NestJS service:
   *   const db = this.prisma.forTenant(tenantId);
   *   const candidates = await db.candidate.findMany();
   */
  forTenant(tenantId: string) {
    return this.$extends(tenantExtension(tenantId));
  }
}
