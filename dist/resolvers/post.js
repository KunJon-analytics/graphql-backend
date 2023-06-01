"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostResolver = exports.PaginatedPosts = void 0;
const type_graphql_1 = require("type-graphql");
const Post_1 = require("../entities/Post");
const isAuth_1 = require("../middleware/isAuth");
const User_1 = require("../entities/User");
const typeorm_1 = require("typeorm");
const Updoot_1 = require("../entities/Updoot");
let PostInput = class PostInput {
};
__decorate([
    (0, type_graphql_1.Field)(),
    __metadata("design:type", String)
], PostInput.prototype, "title", void 0);
__decorate([
    (0, type_graphql_1.Field)(),
    __metadata("design:type", String)
], PostInput.prototype, "text", void 0);
PostInput = __decorate([
    (0, type_graphql_1.InputType)()
], PostInput);
let PaginatedPosts = class PaginatedPosts {
};
__decorate([
    (0, type_graphql_1.Field)(() => [Post_1.Post]),
    __metadata("design:type", Array)
], PaginatedPosts.prototype, "posts", void 0);
__decorate([
    (0, type_graphql_1.Field)(),
    __metadata("design:type", Boolean)
], PaginatedPosts.prototype, "hasMore", void 0);
PaginatedPosts = __decorate([
    (0, type_graphql_1.ObjectType)()
], PaginatedPosts);
exports.PaginatedPosts = PaginatedPosts;
let PostResolver = class PostResolver {
    textSnippet(post) {
        return post.text.substring(0, 50);
    }
    posts(limit, cursor, { dataSource }) {
        return __awaiter(this, void 0, void 0, function* () {
            const realLimit = Math.min(50, limit);
            const reaLimitPlusOne = realLimit + 1;
            const options = cursor
                ? {
                    relations: {
                        creator: true,
                    },
                    where: {
                        createdAt: (0, typeorm_1.LessThan)(new Date(parseInt(cursor))),
                    },
                    order: { createdAt: "DESC" },
                    skip: 0,
                    take: reaLimitPlusOne,
                }
                : {
                    relations: {
                        creator: true,
                    },
                    order: { createdAt: "DESC" },
                    skip: 0,
                    take: reaLimitPlusOne,
                };
            const postRepository = dataSource.getRepository(Post_1.Post);
            const posts = yield postRepository.find(options);
            return {
                posts: posts.slice(0, realLimit),
                hasMore: posts.length === reaLimitPlusOne,
            };
        });
    }
    post(id, { dataSource }) {
        const postRepository = dataSource.getRepository(Post_1.Post);
        const post = postRepository.findOne({
            relations: { creator: true },
            where: { id },
        });
        return post;
    }
    createPost(input, { req, dataSource }) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!input.text || !input.title) {
                throw new Error("Wrong input");
            }
            const postRepository = dataSource.getRepository(Post_1.Post);
            const userRepository = dataSource.getRepository(User_1.User);
            const creator = yield userRepository.findOneBy({ id: req.session.userId });
            const post = new Post_1.Post();
            post.title = input.title;
            post.text = input.text;
            post.creator = creator;
            return postRepository.save(post);
        });
    }
    updatePost(id, title, { dataSource }) {
        return __awaiter(this, void 0, void 0, function* () {
            const postRepository = dataSource.getRepository(Post_1.Post);
            const post = yield postRepository.findOneBy({ id });
            if (!post) {
                return null;
            }
            if (title) {
                post.title = title;
                yield postRepository.save(post);
            }
            return post;
        });
    }
    deletePost(id, { dataSource }) {
        return __awaiter(this, void 0, void 0, function* () {
            const postRepository = dataSource.getRepository(Post_1.Post);
            const post = yield postRepository.findOneBy({ id });
            if (!post) {
                return false;
            }
            yield postRepository.remove(post);
            return true;
        });
    }
    vote(postId, value, { req, dataSource }) {
        return __awaiter(this, void 0, void 0, function* () {
            const isUpdoot = value !== -1;
            const realValue = isUpdoot ? 1 : -1;
            const { userId } = req.session;
            const updootRepository = dataSource.getRepository(Updoot_1.Updoot);
            const postRepository = dataSource.getRepository(Post_1.Post);
            const updoot = yield updootRepository.findOne({
                where: { postId, userId },
            });
            const post = yield postRepository.findOneBy({ id: postId });
            if (!post) {
                return false;
            }
            if (updoot && updoot.value !== realValue) {
                updoot.value = realValue;
                post.points = post.points + realValue * 2;
                yield updootRepository.save(updoot);
                yield postRepository.save(post);
            }
            else if (!updoot) {
                const updoot = new Updoot_1.Updoot();
                updoot.userId = userId;
                updoot.postId = postId;
                updoot.value = realValue;
                post.points = post.points + realValue;
                yield updootRepository.save(updoot);
                yield postRepository.save(post);
            }
            return true;
        });
    }
};
__decorate([
    (0, type_graphql_1.FieldResolver)(() => String),
    __param(0, (0, type_graphql_1.Root)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Post_1.Post]),
    __metadata("design:returntype", void 0)
], PostResolver.prototype, "textSnippet", null);
__decorate([
    (0, type_graphql_1.Query)(() => PaginatedPosts),
    __param(0, (0, type_graphql_1.Arg)("limit", () => type_graphql_1.Int)),
    __param(1, (0, type_graphql_1.Arg)("cursor", () => String, { nullable: true })),
    __param(2, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "posts", null);
__decorate([
    (0, type_graphql_1.Query)(() => Post_1.Post, { nullable: true }),
    __param(0, (0, type_graphql_1.Arg)("id")),
    __param(1, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "post", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => Post_1.Post),
    (0, type_graphql_1.UseMiddleware)(isAuth_1.isAuth),
    __param(0, (0, type_graphql_1.Arg)("input")),
    __param(1, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [PostInput, Object]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "createPost", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => Post_1.Post, { nullable: true }),
    __param(0, (0, type_graphql_1.Arg)("id")),
    __param(1, (0, type_graphql_1.Arg)("title", () => String, { nullable: true })),
    __param(2, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, Object]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "updatePost", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => Boolean),
    __param(0, (0, type_graphql_1.Arg)("id")),
    __param(1, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "deletePost", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => Boolean),
    (0, type_graphql_1.UseMiddleware)(isAuth_1.isAuth),
    __param(0, (0, type_graphql_1.Arg)("postId", () => type_graphql_1.Int)),
    __param(1, (0, type_graphql_1.Arg)("value", () => type_graphql_1.Int)),
    __param(2, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Object]),
    __metadata("design:returntype", Promise)
], PostResolver.prototype, "vote", null);
PostResolver = __decorate([
    (0, type_graphql_1.Resolver)(Post_1.Post)
], PostResolver);
exports.PostResolver = PostResolver;
//# sourceMappingURL=post.js.map