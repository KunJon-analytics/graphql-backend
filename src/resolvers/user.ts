import {
  Resolver,
  Ctx,
  InputType,
  Field,
  Mutation,
  Query,
  Arg,
  ObjectType,
  FieldResolver,
  Root,
} from "type-graphql";
import argon2 from "argon2";
import { v4 } from "uuid";

import { User } from "../entities/User";
import { MyContext } from "../types";
import { COOKIE_NAME, FORGET_PASSWORD_PREFIX } from "../constants";
// import sendMail from "../utils/sendMail";
import { validateRegister } from "../utils/validateRegister";

@InputType()
export class UsernamePasswordInput {
  @Field()
  username: string;
  @Field()
  password: string;
  @Field()
  email: string;
}

@ObjectType()
class FieldError {
  @Field()
  field: string;
  @Field()
  message: string;
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver(User)
export class UserResolver {
  @FieldResolver(() => String)
  email(@Root() user: User, @Ctx() { req }: MyContext) {
    if (req.session.userId === user.id) {
      return user.email;
    }
    return "";
  }

  @Query(() => UserResponse)
  async me(@Ctx() { dataSource, req }: MyContext): Promise<UserResponse> {
    const sessionUserId = req.session.userId;
    if (!sessionUserId) {
      return {
        errors: [{ field: "username", message: "You are not authenticated" }],
      };
    }
    const userRepository = dataSource.getRepository(User);
    const user = await userRepository.findOneBy({
      id: sessionUserId,
    });
    if (!user) {
      return {
        errors: [{ field: "username", message: "Invalid cookie" }],
      };
    }
    return { user };
  }
  @Mutation(() => UserResponse)
  async register(
    @Arg("options") options: UsernamePasswordInput,
    @Ctx() { dataSource, req }: MyContext
  ): Promise<UserResponse> {
    const errors = validateRegister(options);
    if (errors) {
      return { errors };
    }
    const hashedPassword = await argon2.hash(options.password);
    const userRepository = dataSource.getRepository(User);

    // example how to save DM entity

    const user = userRepository.create({
      ...options,
      password: hashedPassword,
    });

    try {
      const savedUser = await userRepository.save(user);
      // store user id session
      // this will set a cookie on the user
      // keep them logged in
      req.session.userId = user.id;
      return { user: savedUser };
    } catch (error) {
      // console.log(error);
      if (error.code === "23505") {
        return {
          errors: [
            {
              field: error.detail.includes("(email)") ? "email" : "username",
              message: error.detail,
            },
          ],
        };
      }
      return {
        errors: [
          {
            field: "username",
            message: "username already taken",
          },
        ],
      };
    }
  }

  @Mutation(() => UserResponse, { nullable: true })
  async login(
    @Arg("usernameOrEmail") usernameOrEmail: string,
    @Arg("password") password: string,
    @Ctx() { dataSource, req }: MyContext
  ): Promise<UserResponse> {
    const userRepository = dataSource.getRepository(User);
    const user = await userRepository.findOneBy(
      usernameOrEmail.includes("@")
        ? { email: usernameOrEmail }
        : { username: usernameOrEmail }
    );

    if (!user) {
      return {
        errors: [
          { field: "usernameOrEmail", message: "Username does not exist" },
        ],
      };
    }
    const valid = await argon2.verify(user.password, password);
    if (!valid) {
      return {
        errors: [{ field: "password", message: "Invalid password" }],
      };
    }
    req.session.userId = user.id;
    return { user };
  }

  @Mutation(() => UserResponse)
  async changePassword(
    @Arg("token") token: string,
    @Arg("newPassword") newPassword: string,
    @Ctx() { redis, req, dataSource }: MyContext
  ): Promise<UserResponse> {
    if (newPassword.length <= 2) {
      return {
        errors: [
          {
            field: "newPassword",
            message: "length must be greater than 2",
          },
        ],
      };
    }

    const key = FORGET_PASSWORD_PREFIX + token;
    const userId = await redis.get(key);
    if (!userId) {
      return {
        errors: [
          {
            field: "token",
            message: "token expired",
          },
        ],
      };
    }

    const userIdNum = parseInt(userId);
    const userRepository = dataSource.getRepository(User);
    const user = await userRepository.findOneBy({
      id: userIdNum,
    });

    if (!user) {
      return {
        errors: [
          {
            field: "token",
            message: "user no longer exists",
          },
        ],
      };
    }

    user.password = await argon2.hash(newPassword);

    const savedUser = await userRepository.save(user);

    await redis.del(key);

    // log in user after change password
    req.session.userId = user.id;

    return { user: savedUser };
  }

  @Mutation(() => Boolean)
  async logout(@Ctx() { req, res }: MyContext): Promise<boolean> {
    return new Promise((resolve) =>
      req.session.destroy((err) => {
        res.clearCookie(COOKIE_NAME);
        if (err) {
          console.log(err);
          resolve(false);
          return;
        }

        resolve(true);
      })
    );
  }

  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg("email") email: string,
    @Ctx() { redis, dataSource }: MyContext
  ) {
    const userRepository = dataSource.getRepository(User);
    const user = await userRepository.findOneBy({
      email,
    });
    if (!user) {
      // the email is not in the db
      return true;
    }

    const token = v4();

    await redis.set(FORGET_PASSWORD_PREFIX + token, user.id, {
      EX: 60 * 60 * 24 * 3,
    });

    const changePasswordLink = `<a href="http://localhost:3000/change-password/${token}">reset password</a>`;

    // await sendMail(email, changePasswordLink);

    console.log(changePasswordLink);

    return true;
  }
}
