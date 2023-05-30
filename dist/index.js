"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
require("reflect-metadata");
const express4_1 = require("@apollo/server/express4");
const drainHttpServer_1 = require("@apollo/server/plugin/drainHttpServer");
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = require("body-parser");
const express_1 = __importDefault(require("express"));
const server_1 = require("@apollo/server");
const type_graphql_1 = require("type-graphql");
const connect_redis_1 = __importDefault(require("connect-redis"));
const express_session_1 = __importDefault(require("express-session"));
const redis_1 = require("redis");
const constants_1 = require("./constants");
const hello_1 = require("./resolvers/hello");
const post_1 = require("./resolvers/post");
const user_1 = require("./resolvers/user");
const typeorm_1 = __importDefault(require("./typeorm"));
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    const dataSource = yield typeorm_1.default.initialize();
    const app = (0, express_1.default)();
    let redisClient = (0, redis_1.createClient)();
    redisClient.connect().catch(console.error);
    let redisStore = new connect_redis_1.default({
        client: redisClient,
        prefix: "myapp:",
        disableTouch: true,
    });
    app.use((0, express_session_1.default)({
        name: constants_1.COOKIE_NAME,
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
            httpOnly: true,
            secure: constants_1.__prod__,
            sameSite: "lax",
        },
        store: redisStore,
        resave: false,
        saveUninitialized: false,
        secret: "keyboard cat",
    }));
    const httpServer = http_1.default.createServer(app);
    const apolloServer = new server_1.ApolloServer({
        schema: yield (0, type_graphql_1.buildSchema)({
            resolvers: [hello_1.HelloResolver, post_1.PostResolver, user_1.UserResolver],
            validate: false,
        }),
        plugins: [(0, drainHttpServer_1.ApolloServerPluginDrainHttpServer)({ httpServer })],
    });
    yield apolloServer.start();
    app.use("/graphql", (0, cors_1.default)({
        origin: "http://localhost:3000",
        credentials: true,
    }), (0, body_parser_1.json)(), (0, express4_1.expressMiddleware)(apolloServer, {
        context: ({ req, res }) => __awaiter(void 0, void 0, void 0, function* () {
            return ({
                dataSource,
                req,
                res,
                redis: redisClient,
            });
        }),
    }));
    yield new Promise((resolve) => httpServer.listen({ port: 4000 }, resolve));
    console.log(`🚀 Server ready at http://localhost:4000/`);
});
try {
    main();
}
catch (error) {
    console.error(error);
}
//# sourceMappingURL=index.js.map