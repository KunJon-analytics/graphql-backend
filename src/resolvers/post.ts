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
  FieldResolver,
  Root,
} from "type-graphql";

import { MyContext } from "src/types";
import { Post } from "../entities/Post";
import { isAuth } from "../middleware/isAuth";
import { User } from "../entities/User";
import { FindManyOptions, LessThan } from "typeorm";
import { Updoot } from "../entities/Updoot";

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
  @FieldResolver(() => String)
  textSnippet(@Root() post: Post) {
    return post.text.substring(0, 50);
  }

  @Query(() => PaginatedPosts)
  async posts(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, { nullable: true }) cursor: string | null,
    @Ctx() { dataSource }: MyContext
  ): Promise<PaginatedPosts> {
    // 20 -> 21
    const realLimit = Math.min(50, limit);
    const reaLimitPlusOne = realLimit + 1;

    const options: FindManyOptions<Post> = cursor
      ? {
          relations: {
            creator: true,
          },
          where: {
            createdAt: LessThan(new Date(parseInt(cursor))),
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

    const postRepository = dataSource.getRepository(Post);
    const posts = await postRepository.find(options);

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
    const post = postRepository.findOne({
      relations: { creator: true },
      where: { id },
    });
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

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async vote(
    @Arg("postId", () => Int) postId: number,
    @Arg("value", () => Int) value: number,
    @Ctx() { req, dataSource }: MyContext
  ) {
    const isUpdoot = value !== -1;
    const realValue = isUpdoot ? 1 : -1;
    const { userId } = req.session;

    const updootRepository = dataSource.getRepository(Updoot);
    const postRepository = dataSource.getRepository(Post);

    const updoot = await updootRepository.findOne({
      where: { postId, userId },
    });
    const post = await postRepository.findOneBy({ id: postId });

    if (!post) {
      return false;
    }

    // the user has voted on the post before
    // and they are changing their vote

    if (updoot && updoot.value !== realValue) {
      updoot.value = realValue;
      post.points = post.points + realValue * 2;
      await updootRepository.save(updoot);
      await postRepository.save(post);
    } else if (!updoot) {
      // has never voted before
      const updoot = new Updoot();
      updoot.userId = userId as number;
      updoot.postId = postId;
      updoot.value = realValue;
      post.points = post.points + realValue;
      await updootRepository.save(updoot);
      await postRepository.save(post);
    }
    return true;
  }
}
