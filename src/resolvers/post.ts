import {
  Resolver,
  Query,
  Ctx,
  Arg,
  Mutation,
  UseMiddleware,
  InputType,
  Field,
} from "type-graphql";

import { MyContext } from "src/types";
import { Post } from "../entities/Post";
import { isAuth } from "../middleware/isAuth";
import { User } from "../entities/User";

@InputType()
class PostInput {
  @Field()
  title: string;
  @Field()
  text: string;
}

@Resolver()
export class PostResolver {
  @Query(() => [Post])
  posts(@Ctx() { dataSource }: MyContext): Promise<Post[]> {
    const postRepository = dataSource.getRepository(Post);
    const posts = postRepository.find();
    return posts;
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
