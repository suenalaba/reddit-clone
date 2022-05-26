import { User } from "../entities/User";
import { MyContext } from "src/types";
import { Resolver, Mutation, Field, Arg, Ctx, ObjectType, Query, FieldResolver, Root } from "type-graphql";
import argon2 from 'argon2';
import { COOKIE_NAME, FORGOT_PASSWORD_PREFIX } from "../constants";
import { UsernamePassWordInput } from "./UsernamePassWordInput";
import { validateRegister } from "../utils/validateRegister";
import { sendEmail } from "../utils/sendEmail";
import { v4 } from 'uuid'; 
import { getConnection } from "typeorm";

@ObjectType()
class FieldError {
    @Field()
    field: string; //email or password
    @Field()
    message: string; //message of what is actually wrong
}

//can use response object to handle user input related errors accordingly
//return a user if worked properly else return error.
//object type is returned for mutation, input type used for argument
@ObjectType() //user response type return user and error
class UserResponse {
    @Field(() => [FieldError], {nullable: true})
    errors?: FieldError[];

    @Field(() => User, {nullable: true})
    user?: User;
}

@Resolver(User)
export class UserResolver {

    @FieldResolver(() => String)
    email(@Root() user: User, @Ctx() {req}: MyContext) {
        //this is the current user and its ok to show them their own email
        if (req.session.userId === user.id) {
            return user.email;
        }
        // current user wants to see someone else email
        return ""; //we will disallow it! //managing permissions.
    }

    @Mutation(() => UserResponse)
    async changePassword(
        @Arg('token') token: string,
        @Arg('newPassword') newPassword: string,
        @Ctx() { redis, req }: MyContext
    ): Promise<UserResponse> {
        if (newPassword.length <= 2) {
            return { errors:  [
              {
                field: 'newPassword',
                message: 'length must be greater than 2',
              },
            ] };
        }

        const key = FORGOT_PASSWORD_PREFIX + token;
        //check if token is good
        const userId = await redis.get(key);
        if (!userId) {
            return { errors:  [
                {
                  field: 'token',
                  message: 'token expired',
                },
              ] 
            };
        }

        //send a good token, got the user from redis so we want to update user
        const userIdNum = parseInt(userId)
        const user = await User.findOne(userIdNum);

        if (!user) {
            return { errors:  [
                {
                  field: 'token',
                  message: 'user no longer exists',
                },
              ] 
            };
        }

       await User.update(
            {id: userIdNum}, 
            {
                password: await argon2.hash(newPassword),
            }
        );
        await redis.del(key); //remove from redis cannot use repeated token

        // log in user after change password
        req.session.userId = user.id;

        return { user };
    }

    @Mutation(() => Boolean)
    //look up user by email, let user type in email and send them an email, but need to make sure they exist in database
    //fetch user by email before sending email to them
    async forgotPassword(
        @Arg('email') email: string,
        @Ctx() { redis }: MyContext
    ) {
        const user =  await User.findOne({where: {email}}) //have to use where when we want to search for column that is not the primary key
        if (!user) {
            //the email is not in the db
            return true; //return true and don't do anything. for security reasons we dont want to let user know the email doesn't exist.
        }

        const token = v4(); //generate random string token

        //storing token in redis, whenever use change password, token will pass back to us & look up the value to get user id.
        await redis.set(FORGOT_PASSWORD_PREFIX + token, user.id, 'ex', 1000 * 60 * 60 * 24 * 30); //3days

        //pass the token to validate we know who they are
        //make sure to switch this to actual production url
        await sendEmail(email, `<a href="http://localhost:3000/change-password/${token}">reset password</a>`);

        return true;
    }

    @Query(() => User, {nullable: true})
    me(
        @Ctx() { req }: MyContext
    ) {
        //you are not logged in if no user id property in the session
        if (!req.session.userId) {
            return null; //whether user logged in depends on whether they have a cookie in the session
        }

        //use user id to fetch entire user object and return it
        return User.findOne(req.session.userId);
    }

    @Mutation(()=> UserResponse)
    async register(
        @Arg('options', () => UsernamePassWordInput) options: UsernamePassWordInput,
        @Ctx() { req }: MyContext
    ): Promise<UserResponse> {
        const errors = validateRegister(options);
        if (errors) {
            return { errors };
        }

        const hashedPassword = await argon2.hash(options.password);
        // const user = em.create(User, {
        //     username: options.username,
        //     password: hashedPassword
        // }); //if using persistAndFlush
        let user;
        try {
            //alternative to query builder
            // User.create({}).save();
            //insert user and getting it back
            //using type orm query builder
            const result = await getConnection()
                .createQueryBuilder()
                .insert()
                .into(User)
                .values({
                    username: options.username,
                    email: options.email,
                    password: hashedPassword,
                })
                .returning('*')
                .execute();
            console.log("result: ", result); //console log to see the user what it returns.
            user = result.raw[0];
        } catch(err) {
            console.timeLog("err code: ", err); //to check if error code is the same
            if (err.code === '23505' || err.detail.includes('already exists')) {
                //this is obtain from error in console log
                //duplicate username error
                return {
                    errors: [
                        {
                            field: "username",
                            message: "username already taken",
                        },
                    ],
                }
            }
        }

        //once user register, store user id session
        //this will set a cookie on the user
        //keep them logged in
        req.session.userId = user.id;
        //req.session.user = user; //can store entire user also, but properties can change
        return { user };
    }

    @Mutation(()=> UserResponse)
    async login(
        @Arg("usernameOrEmail") usernameOrEmail: string,
        @Arg("password") password: string,
        // @Arg('options', () => UsernamePassWordInput) options: UsernamePassWordInput,
        @Ctx() { req }: MyContext
    ): Promise<UserResponse> {
        const user = await User.findOne(
            //conditionally finding user based on whether there is '@' sign
            usernameOrEmail.includes('@') ?  
            { where: { email: usernameOrEmail } }
            : { where: { username: usernameOrEmail } }
            ); //find user
        if (!user) {
            return {
                errors: [
                    {
                    field: 'usernameOrEmail',
                    message: "Username doesn't exist",
                    },
                ],
            };
        }
        //argon2 will verify is password is correct
        const valid = await argon2.verify(user.password, password);
        if (!valid) {
            return {
                errors: [
                    {
                    field: 'password',
                    message: "Incorrect password",
                    },
                ],
            };
        }

        //what you want to store in the session
        //exclamation point because you know it will always be defined
        req.session.userId = user.id;

        return {
            user, //no errors
        };
    }

    @Mutation(() => Boolean)
    logout(
        //passing in parameter 'req' only removes the session in redis
        //res is response object
        @Ctx() { req, res }: MyContext
    ) {
        return new Promise((resolve) => 
            req.session.destroy((err) => { //destroy remove session from redis
                res.clearCookie(COOKIE_NAME);
                if (err) {
                    console.log(err);
                    resolve(false);
                    return
                }
            // res.clearCookie("qid"); //can put here only when session is destroyed put here.
            resolve(true);
        }));
    }
}

// for mikro - orm
// @ObjectType()
// class FieldError {
//     @Field()
//     field: string; //email or password
//     @Field()
//     message: string; //message of what is actually wrong
// }

// //can use response object to handle user input related errors accordingly
// //return a user if worked properly else return error.
// //object type is returned for mutation, input type used for argument
// @ObjectType() //user response type return user and error
// class UserResponse {
//     @Field(() => [FieldError], {nullable: true})
//     errors?: FieldError[];

//     @Field(() => User, {nullable: true})
//     user?: User;
// }

// @Resolver()
// export class UserResolver {
//     @Mutation(() => UserResponse)
//     async changePassword(
//         @Arg('token') token: string,
//         @Arg('newPassword') newPassword: string,
//         @Ctx() { redis, em, req }: MyContext
//     ): Promise<UserResponse> {
//         if (newPassword.length <= 2) {
//             return { errors:  [
//               {
//                 field: 'newPassword',
//                 message: 'length must be greater than 2',
//               },
//             ] };
//         }

//         const key = FORGOT_PASSWORD_PREFIX + token;
//         //check if token is good
//         const userId = await redis.get(key);
//         if (!userId) {
//             return { errors:  [
//                 {
//                   field: 'token',
//                   message: 'token expired',
//                 },
//               ] 
//             };
//         }

//         //send a good token, got the user from redis so we want to update user
//         const user = await em.findOne(User, { id: parseInt(userId) });

//         if (!user) {
//             return { errors:  [
//                 {
//                   field: 'token',
//                   message: 'user no longer exists',
//                 },
//               ] 
//             };
//         }

//         // user.password = newPassword //we need to hash password so we shouldn't do this
//         user.password = await argon2.hash(newPassword);
//         await em.persistAndFlush(user); //updated at auto updates due to onupdate property

//         await redis.del(key); //remove from redis cannot use repeated token

//         // log in user after change password
//         req.session.userId = user.id;

//         return { user };
//     }

//     @Mutation(() => Boolean)
//     //look up user by email, let user type in email and send them an email, but need to make sure they exist in database
//     //fetch user by email before sending email to them
//     async forgotPassword(
//         @Arg('email') email: string,
//         @Ctx() { em, redis }: MyContext
//     ) {
//         const user =  await em.findOne(User, {email})
//         if (!user) {
//             //the email is not in the db
//             return true; //return true and don't do anything. for security reasons we dont want to let user know the email doesn't exist.
//         }

//         const token = v4(); //generate random string token

//         //storing token in redis, whenever use change password, token will pass back to us & look up the value to get user id.
//         await redis.set(FORGOT_PASSWORD_PREFIX + token, user.id, 'ex', 1000 * 60 * 60 * 24 * 30); //3days

//         //pass the token to validate we know who they are
//         await sendEmail(email, `<a href="http://localhost:3000/change-password/${token}">reset password</a>`);

//         return true;
//     }

//     @Query(() => User, {nullable: true})
//     async me(
//         @Ctx() { req,em }: MyContext
//     ) {
//         //you are not logged in if no user id property in the session
//         if (!req.session.userId) {
//             return null; //whether user logged in depends on whether they have a cookie in the session
//         }

//         //use user id to fetch entire user object and return it
//         const user = await em.findOne(User, {id: req.session.userId});
//         return user;
//     }

//     @Mutation(()=> UserResponse)
//     async register(
//         @Arg('options', () => UsernamePassWordInput) options: UsernamePassWordInput,
//         @Ctx() { em, req }: MyContext
//     ): Promise<UserResponse> {
//         const errors = validateRegister(options);
//         if (errors) {
//             return { errors };
//         }

//         const hashedPassword = await argon2.hash(options.password);
//         // const user = em.create(User, {
//         //     username: options.username,
//         //     password: hashedPassword
//         // }); //if using persistAndFlush
//         let user;
//         try {
//             //pass entity to build off
//             const result = await (em as EntityManager)
//                 .createQueryBuilder(User)
//                 .getKnexQuery()
//                 .insert({
//                     username: options.username,
//                     email: options.email,
//                     password: hashedPassword,
//                     //createdAt is what we call it but mikro-orm will actually add underscore, knex dont know, 
//                     //so we need to change to underscore as per database to match.
//                     created_at: new Date(), //need to manually at created at and updated at because we are using knex 
//                     updated_at: new Date(), //and not mikro-orm directly
//                 })
//                 .returning("*"); //return all the fields
//                 user = result[0];
//                 //whenever there is an issue with Orm, drop back and write the query using sql directly
//                 //use query builder to rewrite the persistAndFlush error
//                 // await em.persistAndFlush(user); //might throw error when using this mikro-orm function
//         } catch(err) {
//             if (err.code === '23505' || err.detail.includes('already exists')) {
//                 //this is obtain from error in console log
//                 //duplicate username error
//                 return {
//                     errors: [
//                         {
//                             field: "username",
//                             message: "username already taken",
//                         },
//                     ],
//                 }
//             }
//         }

//         //once user register, store user id session
//         //this will set a cookie on the user
//         //keep them logged in
//         req.session.userId = user.id;
//         //req.session.user = user; //can store entire user also, but properties can change
//         return { user };
//     }

//     @Mutation(()=> UserResponse)
//     async login(
//         @Arg("usernameOrEmail") usernameOrEmail: string,
//         @Arg("password") password: string,
//         // @Arg('options', () => UsernamePassWordInput) options: UsernamePassWordInput,
//         @Ctx() { em, req }: MyContext
//     ): Promise<UserResponse> {
//         const user = await em.findOne(
//             User, 
//             //conditionally finding user based on whether there is '@' sign
//             usernameOrEmail.includes('@') ?  
//             { email: usernameOrEmail }
//             : {username: usernameOrEmail}
//             ); //find user
//         if (!user) {
//             return {
//                 errors: [
//                     {
//                     field: 'usernameOrEmail',
//                     message: "Username doesn't exist",
//                     },
//                 ],
//             };
//         }
//         //argon2 will verify is password is correct
//         const valid = await argon2.verify(user.password, password);
//         if (!valid) {
//             return {
//                 errors: [
//                     {
//                     field: 'password',
//                     message: "Incorrect password",
//                     },
//                 ],
//             };
//         }

//         //what you want to store in the session
//         //exclamation point because you know it will always be defined
//         req.session.userId = user.id;

//         return {
//             user, //no errors
//         };
//     }

//     @Mutation(() => Boolean)
//     logout(
//         //passing in parameter 'req' only removes the session in redis
//         //res is response object
//         @Ctx() { req, res }: MyContext
//     ) {
//         return new Promise((resolve) => 
//             req.session.destroy((err) => { //destroy remove session from redis
//                 res.clearCookie(COOKIE_NAME);
//                 if (err) {
//                     console.log(err);
//                     resolve(false);
//                     return
//                 }
//             // res.clearCookie("qid"); //can put here only when session is destroyed put here.
//             resolve(true);
//         }));
//     }
// }