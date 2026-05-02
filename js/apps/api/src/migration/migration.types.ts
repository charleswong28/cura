export interface GllueRow {
  id: number;
  dateAdded?: Date | string;
  lastUpdateDate?: Date | string;
  is_deleted?: number;
  [key: string]: unknown;
}

export type FkResolver = (
  sourceTable: string,
  sourceId: number | string,
  tenantId: string
) => Promise<string | null>;

export interface GllueMapper<S extends GllueRow = GllueRow, T = Record<string, unknown>> {
  readonly sourceTable: string;
  readonly targetModel: string;
  readonly prismaModel: string;
  map(row: S, tenantId: string, resolveFk: FkResolver): Promise<T | null>;
}

export interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
}
