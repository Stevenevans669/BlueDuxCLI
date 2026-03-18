import Database from "better-sqlite3";

export function createDb(path: string = "data/bluedux.db"): Database.Database {
  return new Database(path);
}
