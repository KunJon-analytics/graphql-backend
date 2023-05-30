import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./entities/User";
import { Post } from "./entities/Post";
import { Updoot } from "./entities/Updoot";
import { __prod__ } from "./constants";

const AppDataSource = new DataSource({
  type: "postgres",
  host: "localhost",
  port: 5432,
  username: "postgres",
  password: "Fireballs25005764",
  database: "graphql",
  entities: [User, Post, Updoot],
  synchronize: true,
  logging: !__prod__,
  subscribers: ["dist/subscriber/*.js"],
  migrations: ["dist/migration/*.js"],
});

export default AppDataSource;
