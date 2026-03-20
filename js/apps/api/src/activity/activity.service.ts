import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { generateId } from "../common/ulid";

interface LogParams {
  tenantId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class ActivityLogService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async log(params: LogParams) {
    const db = this.prisma.forTenant(params.tenantId);
    return db.activityLog.create({
      data: {
        id: generateId(),
        userId: params.userId,
        action: params.action as any,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: params.metadata ?? undefined,
      } as any,
    });
  }

  async findRecent(tenantId: string, limit = 50, offset = 0) {
    const db = this.prisma.forTenant(tenantId);
    return db.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
  }
}
