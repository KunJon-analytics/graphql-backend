"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const User_1 = require("./entities/User");
const Post_1 = require("./entities/Post");
const Updoot_1 = require("./entities/Updoot");
const constants_1 = require("./constants");
const AppDataSource = new typeorm_1.DataSource({
    type: "postgres",
    host: "localhost",
    port: 5432,
    username: "postgres",
    password: "Fireballs25005764",
    database: "graphql",
    entities: [User_1.User, Post_1.Post, Updoot_1.Updoot],
    synchronize: true,
    logging: !constants_1.__prod__,
    subscribers: ["dist/subscriber/*.js"],
    migrations: ["dist/migration/*.js"],
});
exports.default = AppDataSource;
//# sourceMappingURL=typeorm.js.map