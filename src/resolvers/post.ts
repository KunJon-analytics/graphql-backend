import {
  Resolver,
  Query,
  Ctx,
  Arg,
  Mutation,
  UseMiddleware,
  InputType,
  Field,
  ObjectType,
  Int,
  // FieldResolver,
  // Root,
} from "type-graphql";

import { MyContext } from "src/types";
import { Post } from "../entities/Post";
import { isAuth } from "../middleware/isAuth";
import { User } from "../entities/User";
import { LessThan } from "typeorm";

@InputType()
class PostInput {
  @Field()
  title: string;
  @Field()
  text: string;
}

@ObjectType()
export class PaginatedPosts {
  @Field(() => [Post])
  posts: Post[];
  @Field()
  hasMore: boolean;
}

@Resolver(Post)
export class PostResolver {
  // @FieldResolver(() => User)
  // creator(@Root() post: Post) {
  //   return post;
  // }

  @Query(() => PaginatedPosts)
  async posts(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, { nullable: true }) cursor: string | null,
    @Ctx() { dataSource }: MyContext
  ): Promise<PaginatedPosts> {
    // 20 -> 21
    const realLimit = Math.min(50, limit);
    const reaLimitPlusOne = realLimit + 1;

    const replacements: any[] = [reaLimitPlusOne];

    if (cursor) {
      replacements.push(new Date(parseInt(cursor)));
    }

    const parsedCursor = cursor ? new Date(parseInt(cursor)) : new Date();

    const postRepository = dataSource.getRepository(Post);
    const posts = await postRepository.find({
      relations: {
        creator: true,
      },
      where: {
        createdAt: LessThan(parsedCursor),
      },
      order: { createdAt: "DESC" },
      skip: 0,
      take: reaLimitPlusOne,
    });

    // const posts = await dataSource.query(
    //   `
    // select p.*
    // from post p
    // ${cursor ? `where p."createdAt" < $2` : ""}
    // order by p."createdAt" DESC
    // limit $1
    // `,
    //   replacements
    // );

    // const qb = getConnection()
    //   .getRepository(Post)
    //   .createQueryBuilder("p")
    //   .innerJoinAndSelect("p.creator", "u", 'u.id = p."creatorId"')
    //   .orderBy('p."createdAt"', "DESC")
    //   .take(reaLimitPlusOne);

    // if (cursor) {
    //   qb.where('p."createdAt" < :cursor', {
    //     cursor: new Date(parseInt(cursor)),
    //   });
    // }

    // const posts = await qb.getMany();
    // console.log("posts: ", posts);

    return {
      posts: posts.slice(0, realLimit),
      hasMore: posts.length === reaLimitPlusOne,
    };
  }

  @Query(() => Post, { nullable: true })
  post(
    @Arg("id") id: number,
    @Ctx() { dataSource }: MyContext
  ): Promise<Post | null> {
    const postRepository = dataSource.getRepository(Post);
    const post = postRepository.findOneBy({ id });
    return post;
  }

  @Mutation(() => Post)
  @UseMiddleware(isAuth)
  async createPost(
    @Arg("input") input: PostInput,
    @Ctx() { req, dataSource }: MyContext
  ): Promise<Post> {
    if (!input.text || !input.title) {
      throw new Error("Wrong input");
    }
    const postRepository = dataSource.getRepository(Post);
    const userRepository = dataSource.getRepository(User);
    const creator = await userRepository.findOneBy({ id: req.session.userId });
    const post = new Post();
    post.title = input.title;
    post.text = input.text;
    post.creator = creator as User;

    return postRepository.save(post);
  }

  @Mutation(() => Post, { nullable: true })
  async updatePost(
    @Arg("id") id: number,
    @Arg("title", () => String, { nullable: true }) title: string,
    @Ctx() { dataSource }: MyContext
  ): Promise<Post | undefined | null> {
    const postRepository = dataSource.getRepository(Post);
    const post = await postRepository.findOneBy({ id });
    if (!post) {
      return null;
    }

    if (title) {
      post.title = title;
      await postRepository.save(post);
    }

    return post;
  }

  @Mutation(() => Boolean)
  async deletePost(
    @Arg("id") id: number,
    @Ctx() { dataSource }: MyContext
  ): Promise<boolean> {
    const postRepository = dataSource.getRepository(Post);
    const post = await postRepository.findOneBy({ id });
    if (!post) {
      return false;
    }
    await postRepository.remove(post);
    return true;
  }
}
