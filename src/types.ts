// import { PostgreSqlDriver, SqlEntityManager } from "@mikro-orm/postgresql";
import { Request, Response } from "express";
import { RedisClientType } from "redis";
import { DataSource } from "typeorm";

export interface MyContext {
  // em: SqlEntityManager<PostgreSqlDriver>;
  dataSource: DataSource;
  req: Request;
  res: Response;
  redis: RedisClientType;
}

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}
