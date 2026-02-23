import { ulid } from 'ulid';

/**
 * Generates a ULID (Universally Unique Lexicographically Sortable Identifier).
 * Used as primary key for all database entities.
 *
 * Properties:
 * - 26 characters (base32 encoded)
 * - Lexicographically sortable by creation time
 * - Monotonically increasing within the same millisecond
 * - Globally unique (128 bits of randomness)
 */
export function generateId(): string {
  return ulid();
}
