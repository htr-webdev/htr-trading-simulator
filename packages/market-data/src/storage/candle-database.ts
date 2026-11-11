import { DatabaseSync } from "node:sqlite";

/**
 * Local SQLite storage for historical market data.
 *
 * Owns the database connection lifecycle. Candle insertion and
 * retrieval are built on top of this class in dedicated operations.
 */
export class CandleDatabase {
  private readonly database: DatabaseSync;

  constructor(filePath: string) {
    this.database = new DatabaseSync(filePath);
  }

  close(): void {
    this.database.close();
  }
}
