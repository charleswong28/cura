import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { createHash } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { generateId } from "../common/ulid";
import { GllueClientService } from "./gllue-client.service";
import type { GllueRow, GllueMapper, SyncResult, FkResolver } from "./migration.types";

@Injectable()
export class MigrationService {
  readonly logger = new Logger(MigrationService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(GllueClientService) private readonly gllueClient: GllueClientService
  ) {}

  async getConfig(tenantId: string) {
    return this.prisma.migrationConfig.findUnique({ where: { tenantId } });
  }

  async isSyncEnabled(tenantId: string): Promise<boolean> {
    if (!this.gllueClient.isConfigured) return false;
    const config = await this.getConfig(tenantId);
    return !!config && config.syncEnabled && config.status === "ACTIVE";
  }

  async syncTable(tenantId: string, mapper: GllueMapper, schemaName?: string): Promise<SyncResult> {
    const result: SyncResult = { created: 0, updated: 0, skipped: 0, errors: 0 };

    const cursor = await this.prisma.migrationSyncCursor.upsert({
      where: { tenantId_sourceTable: { tenantId, sourceTable: mapper.sourceTable } },
      create: {
        id: generateId(),
        tenantId,
        sourceTable: mapper.sourceTable,
        lastSyncAt: new Date(0),
      },
      update: {},
    });

    const table = schemaName
      ? `\`${schemaName}\`.\`${mapper.sourceTable}\``
      : `\`${mapper.sourceTable}\``;
    let hasMore = true;

    while (hasMore) {
      const rows = await this.gllueClient.query<GllueRow>(
        `SELECT * FROM ${table}
         WHERE lastUpdateDate > ? OR dateAdded > ?
         ORDER BY id ASC
         LIMIT 500`,
        [cursor.lastSyncAt, cursor.lastSyncAt]
      );

      for (const row of rows) {
        try {
          const outcome = await this.processRow(row, tenantId, mapper);
          if (outcome === "created") result.created++;
          else if (outcome === "updated") result.updated++;
          else result.skipped++;
        } catch (err) {
          result.errors++;
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.error(`[${mapper.sourceTable}] Error on row #${row.id}: ${msg}`);
        }
      }

      await this.prisma.migrationSyncCursor.update({
        where: { tenantId_sourceTable: { tenantId, sourceTable: mapper.sourceTable } },
        data: { lastSyncAt: new Date(), errorCount: result.errors, lastError: null },
      });

      hasMore = rows.length === 500;
    }

    return result;
  }

  private async processRow(
    row: GllueRow,
    tenantId: string,
    mapper: GllueMapper
  ): Promise<"created" | "updated" | "skipped"> {
    const sourceId = String(row.id);
    const checksum = createHash("md5").update(JSON.stringify(row)).digest("hex");

    const existing = await this.prisma.migrationMapping.findUnique({
      where: {
        sourceTable_sourceId_tenantId: { sourceTable: mapper.sourceTable, sourceId, tenantId },
      },
    });

    const fkResolver: FkResolver = this.resolveFk.bind(this);

    if (!existing) {
      const mapped = await mapper.map(row, tenantId, fkResolver);
      if (!mapped) return "skipped";

      const id = generateId();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (this.prisma as any)[mapper.prismaModel].create({ data: { id, ...mapped } });
      await this.prisma.migrationMapping.create({
        data: {
          id: generateId(),
          tenantId,
          sourceTable: mapper.sourceTable,
          sourceId,
          targetModel: mapper.targetModel,
          targetId: id,
          checksum,
        },
      });
      return "created";
    }

    if (existing.checksum !== checksum) {
      const mapped = await mapper.map(row, tenantId, fkResolver);
      if (!mapped) return "skipped";

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (this.prisma as any)[mapper.prismaModel].update({
        where: { id: existing.targetId },
        data: mapped,
      });
      await this.prisma.migrationMapping.update({
        where: { id: existing.id },
        data: { checksum },
      });
      return "updated";
    }

    return "skipped";
  }

  private async resolveFk(
    sourceTable: string,
    sourceId: number | string,
    tenantId: string
  ): Promise<string | null> {
    const mapping = await this.prisma.migrationMapping.findUnique({
      where: {
        sourceTable_sourceId_tenantId: {
          sourceTable,
          sourceId: String(sourceId),
          tenantId,
        },
      },
    });
    return mapping?.targetId ?? null;
  }

  async initiateCutover(tenantId: string, actorId: string): Promise<{ cutoverDate: Date }> {
    const config = await this.getConfig(tenantId);
    if (!config) throw new NotFoundException("MigrationConfig not found for tenant");

    const cutoverDate = new Date();
    await this.prisma.migrationConfig.update({
      where: { tenantId },
      data: { status: "CUTOVER", readOnly: false, syncEnabled: false, cutoverDate },
    });

    await this.prisma.auditLog.create({
      data: {
        id: generateId(),
        tenantId,
        actorId,
        actorType: "USER",
        resourceType: "MigrationConfig",
        resourceId: config.id,
        action: "migration.cutover_completed",
        newValue: { cutoverDate },
      },
    });

    this.logger.log(`Cutover completed for tenant ${tenantId} at ${cutoverDate.toISOString()}`);
    return { cutoverDate };
  }
}
