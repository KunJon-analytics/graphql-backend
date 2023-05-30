"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("./constants");
const Post_1 = require("./entities/Post");
const User_1 = require("./entities/User");
const config = {
    migrations: {
        path: "dist/migrations",
        pathTs: "src/migrations",
    },
    entities: [Post_1.Post, User_1.User],
    dbName: "graphql",
    user: "postgres",
    password: "Fireballs25005764",
    type: "postgresql",
    debug: !constants_1.__prod__,
};
exports.default = config;
//# sourceMappingURL=mikro-orm.config.js.map