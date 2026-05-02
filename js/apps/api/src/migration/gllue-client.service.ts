import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { createPool, Pool } from "mysql2/promise";

@Injectable()
export class GllueClientService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GllueClientService.name);
  private pool!: Pool;

  onModuleInit() {
    const url = process.env["GLLUE_MYSQL_URL"];
    if (!url) {
      this.logger.warn("GLLUE_MYSQL_URL not set — Gllue sync disabled");
      return;
    }
    this.pool = createPool({ uri: url, connectionLimit: 5, waitForConnections: true });
    this.logger.log("Gllue MySQL connection pool initialized");
  }

  async onModuleDestroy() {
    if (this.pool) await this.pool.end();
  }

  get isConfigured(): boolean {
    return !!this.pool;
  }

  async query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    if (!this.pool) return [];
    const [rows] = await this.pool.execute(sql, params);
    return rows as T[];
  }
}
