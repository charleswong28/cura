// Opaque cursor encoding for Relay-style pagination.
// The payload is the row's ULID; we base64url-encode it so clients treat it as opaque.

export function encodeCursor(id: string): string {
  return Buffer.from(id, "utf8").toString("base64url");
}

export function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, "base64url").toString("utf8");
}
