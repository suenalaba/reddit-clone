import { Post } from "../entities/Post";
import { Resolver, Query, Arg, Mutation, InputType, Field, Ctx, UseMiddleware, Int, FieldResolver, Root, ObjectType } from "type-graphql";
import { MyContext } from "src/types";
import { isAuth } from "../middleware/isAuth";
import { getConnection } from "typeorm";
import { Updoot } from "../entities/Updoot";
import { User } from "../entities/User";


@InputType()
class PostInput {
    @Field()
    title: string
    @Field()
    text: string
}

@ObjectType()
class PaginatedPosts {
    @Field(() => [Post]) //graphql type
    posts: Post[] //typescript type
    @Field()
    hasMore: boolean;
}

//CRUD in graphql and mikroOrm for basic entity.
@Resolver(Post)
export class PostResolver {

    @FieldResolver(() => String)
    textSnippet( //called everything we get post object
        @Root() post: Post
    ) {
        return post.text.slice(0,50);
    }

    //every post there is it will call this field resolver
    //bad performance cause 100 sql query for 100 post
    // @FieldResolver(() => User)
    // creator(@Root() post: Post) {
    //     return User.findOne(post.creatorId); //given creator id of the post we fetch a user.
    // }

    //field resolvers only call and fetch data when we select it in our graphql query.

    //after creating user loader use this instead:
    @FieldResolver(() => User)
    creator(
        @Root() post: Post,
        @Ctx() {userLoader}: MyContext
    ) {
        return userLoader.load(post.creatorId); //pass in post creator id not user id
    }

    @FieldResolver(() => Int, {nullable: true})
    async voteStatus(
        @Root() post: Post,
        @Ctx() {updootLoader, req}: MyContext
    ) { 
        if (!req.session.userId) {
            return null; //if used not logged in confirm no vote status so just return null
        }
        const updoot = await updootLoader.load({
            postId: post.id, 
            userId: req.session.userId 
        });
        //no updoot means neveer vote means return null, else display vote accordingly.
        return updoot ? updoot.value : null;
    }

    @Mutation(() => Boolean)
    @UseMiddleware(isAuth) //only allow logged in users to upvote
    async vote(
        @Arg('postId', () => Int) postId: number,
        @Arg("value", () => Int) value: number,
        @Ctx() { req }: MyContext
    ) { 
        const isUpdoot = value !== -1; //of value not -1 then its an updoot
        const realValue = isUpdoot? 1: -1;
        const { userId } = req.session;

        const updoot = await Updoot.findOne({ where: {postId, userId} }); //see if they have entry in database.

        //the user has voted on the post before
        // and they are changing their vote
        if (updoot && updoot.value !== realValue) { //changing downdoot to updoot is ok.
            await getConnection().transaction(async (tm) => {
                //changing vote instead of insert we update the updoot table.
                await tm.query(
                    `
                    update updoot
                    set value = $1
                    where "postId" = $2 and "userId" = $3
                    `,
                    [realValue, postId, userId]
                );
                //vote value 1 post point 1. if change upvote to downvote minus 2 points
                //downvote to upvote add 2 points
                //then update points on the post afterwards
                await tm.query(`
                update post
                set points = points + $1
                where id = $2
                `, [2 * realValue, postId] //therefore 2 * real value.
                );
            });
        } else if (!updoot) {
            //has never voted before
            await getConnection().transaction(async tm => { //handle transaction related errors.
                await tm.query(`
                insert into updoot ("userId", "postId", value)
                values ($1, $2, $3)
                `, [userId, postId, realValue]);
                await tm.query(`
                update post
                set points = points + $1
                where id = $2
                `, [realValue, postId]
                );
            });
        }
        //else don't do anything.
        return true;
        // await Updoot.insert({
        //     userId,
        //     postId,
        //     value: realValue,
        // });
        //increase count on the post
        //$ is index value, cannot just put $1,$2,$3 need to deprepare it.
        //${} no longer converts to prepared statements.
        //insert inside transaction. instead of doing separately.
        // await getConnection().query(`
        // START TRANSACTION;

        // insert into updoot ("userId", "postId", value)
        // values (${userId},${postId},${realValue});

        // update post
        // set points = points + ${realValue}
        // where id = ${postId};

        // COMMIT;
        // `
        //     // [userId, postId, realValue, realValue, postId]
        // );
        // //can use await Post.update() as well alternative to sql
        // return true;
    }

    @Query(()=> PaginatedPosts) 
    async posts(
        @Arg("limit", () => Int) limit: number, //number default is float so need to explicit state
        // @Arg('offset') offset: number, //may have some performance problem, especially when update done frequently.
        //better to use cursor based pagination
        @Arg("cursor", ()=> String, {nullable: true}) cursor: string | null, //you want all post after this point
        //on the first time we fetch post no cursor therefore must set nullable (which means must explicitly set type)
    ): Promise<PaginatedPosts> {
        //user ask for 20 post, we will fetch 21 posts. if we get 21 posts means we got more to show
        const realLimit = Math.min(50, limit);
        const realLimitPlusOne = realLimit + 1;
        // return Post.find(); //better to use query builder for more complex finds.

        const replacements: any[] = [realLimitPlusOne, ]; //might be null

        // if (req.session.userId) {
        //     replacements.push(req.session.userId);
        // }

        // let cursorIdx = 3;

        if (cursor) {
            replacements.push(new Date(parseInt(cursor)));
            // cursorIdx = replacements.length;
        }

        //build raw sql
        //reference post table and select all the fields on it: select p.* from post p
        //in postgres there are multiple schema in the db, so we just need to specify the public schema.
        //to get return type as json which is what graphql expects: json_build_object(the key name, field) [object_name]
        //note comma should only be used wherever the 'select' statement is.
        //inside {} is a subquery
        // const posts = await getConnection().query(`
        // select p.*, 
        // json_build_object(
        //     'id', u.id,
        //     'username', u.username,
        //     'email', u.email,
        //     'createdAt', u."createdAt",
        //     'updatedAt', u."updatedAt"
        //     ) creator, 
        // ${ 
        //     req.session.userId //user not logged in then vote status will be null
        //         ? '(select value from updoot where "userId" = $2 and "postId" = p.id) "voteStatus"' 
        //         : 'null as "voteStatus"' 
        // }
        // from post p
        // inner join public.user u on u.id = p."creatorId"
        // ${cursor ? `where p."createdAt" < $${cursorIdx}` : ""}
        // order by p."createdAt" DESC
        // limit $1
        // `,
        //     replacements
        // );
        
        // //new sql query with creator resolver
        // const posts = await getConnection().query(`
        // select p.*, 
        // ${ 
        //     req.session.userId //user not logged in then vote status will be null
        //         ? '(select value from updoot where "userId" = $2 and "postId" = p.id) "voteStatus"' 
        //         : 'null as "voteStatus"' 
        // }
        // from post p
        // ${cursor ? `where p."createdAt" < $${cursorIdx}` : ""}
        // order by p."createdAt" DESC
        // limit $1
        // `,
        //     replacements
        // );

        //after creating vote status resolver.
        const posts = await getConnection().query(`
        select p.*
        from post p
        ${cursor ? `where p."createdAt" < $2` : ""}
        order by p."createdAt" DESC
        limit $1
        `,
            replacements
        );

        // const qb = getConnection()
        //     .getRepository(Post)
        //     .createQueryBuilder("p") //alias
        //     .innerJoinAndSelect("p.creator", "u", 'u.id = p."creatorId"') //join on u.id = p.creatorid.
        //     .orderBy('p."createdAt"', "DESC") //need to have double quotes around words to ensure we keep the caps
        //     .take(realLimitPlusOne) //using pagination is better to use take. //we will fetch until real limit plus one
        // // if (cursor) {
        // //     qb.where('p."createdAt" < :cursor', {  //to get next post created at < cursor
        // //         cursor: new Date(parseInt(cursor)), //need to pass in int to new date, string cannot
        // //     });
        // // }

        // const posts = await qb.getMany();
        //but only display up to real limit.
        return { 
            posts: posts.slice(0, realLimit), 
            hasMore: posts.length === realLimitPlusOne, //checking if we have more post to fetch
        }; //query builder is stackable on if conditions.
    }

    @Query(()=> Post, {nullable: true})
    post(@Arg('id', () => Int) id: number): Promise<Post | undefined> {  //type orm uses undefined instead of null
        // const post = Post.findOne(id, { relations: ["creator"] }); //we need to add creator to match post.graphql.
        const post = Post.findOne(id); //only need this if we create creator resolver
        //relation will auto do the join for us.
        //why "creator", we called manytoonefield in post.ts creator
        return post;
    }

    //create post, using mutation -> for updating, inserting, deleting
    @Mutation(()=> Post)
    @UseMiddleware(isAuth) //if user not logged in cannot post
    //can create middleware function to check if user is identified and reuse it.
    async createPost(
        @Arg("input") input: PostInput,
        @Ctx() { req }: MyContext
    ): Promise<Post> { 
        //2 sql queries. 1 to insert and 1 to select it
        return Post.create({ 
            ...input,
            creatorId: req.session.userId,
         }).save();
    }

    //update post
    @Mutation(()=> Post, {nullable: true})
    @UseMiddleware(isAuth)
    async updatePost(
        @Arg('id', () => Int) id: number, //default number is float
        // @Arg('title', ()=> String, { nullable: true}) title: string, //can make optional fields nullable
        // @Arg('text', ()=> String, { nullable: true}) text: string, 
        @Arg('title') title: string,
        @Arg('text') text: string,
        @Ctx() { req }: MyContext //only allowed to update post you own
    ): Promise<Post | null> { 
        //sql query to fetch the post
        // const post = await Post.findOne({ where: { id } }); //or just id would do //fetch post
        // if (!post) {
        //     return null;
        // }
        // if (typeof title !== 'undefined') {
        //     //sql query to update the post
        //     await Post.update({ id }, { title, text }); //update based on id, set new title /update
        // }
        // return post;
        //note the above code you are just returning the same original post not the updated post.

        const result = await getConnection()
            .createQueryBuilder()
            .update(Post)
            .set({ title, text })
            .where('id = :id and "creatorId" = :creatorId', {
                id, //name must line up.
                creatorId: req.session.userId, 
            })
            .returning("*") //to return updated post.
            .execute();
        return result.raw[0];
    }

    //delete post
    //add permissions to ensure only ownself can delete post. 
    @Mutation(()=> Boolean)
    @UseMiddleware(isAuth)
    async deletePost(
        @Arg('id', () => Int) id: number,
        @Ctx() { req }: MyContext,
    ): Promise<boolean> { 
        // //normal delete without cascade
        // const post = await Post.findOne(id)
        // if (!post) {
        //     return false;
        // }
        // if (post.creatorId !== req.session.userId) {
        //     //not current user, then no permission to delete
        //     throw new Error('not authorized');
        // }

        // await Updoot.delete({ postId: id}); //delete updoots first
        // await Post.delete({ id });

        //cascade delete
        await Post.delete({ id, creatorId: req.session.userId }); //then need go Post.ts entity to cascade delete
        //in the foreign key relationship
        return true;
    }
}

//this is for mikro-orm

// import { Post } from "../entities/Post";
// import { MyContext } from "src/types";
// import { Resolver, Query, Ctx, Arg, Int, Mutation } from "type-graphql";

// //CRUD in graphql and mikroOrm for basic entity.
// @Resolver()
// export class PostResolver {
//     //create a class and decorate it with resolver
//     @Query(()=> [Post]) //need to specify what query returns, in this case array of post
//     async posts(
//         @Ctx() { em }: MyContext
//     ): Promise<Post[]> { //graph ql query, in this case scheme
//         //is a single query, just hello
//         // await sleep(3000); //set an artificial delay
//         return em.find(Post, {}); //find will return a promise
//     }

//     //look up by ID, query -> reading, find dating
//     @Query(()=> Post, {nullable: true}) //setting graph ql return type
//     post(
//         //inside arg() is setting graphql type
//         //in the sandbox when passing in argument my specify, id: ' ', 
//         //for example if 'identifier' is the argument then specify argument: ' ' in the sandbox
//         @Arg('id', ()=> Int) id: number, //set id type for typescript //for argument in typegraphql
//         @Ctx() { em }: MyContext
//     ): Promise<Post | null> {  //setting type script return type
//         return em.findOne(Post, { id }); //find one means find only one entry
//     }

//     //create post, using mutation -> for updating, inserting, deleting
//     @Mutation(()=> Post)
//     async createPost(
//         @Arg('title', ()=> String) title: string,
//         @Ctx() { em }: MyContext
//     ): Promise<Post> { 
//         const post = em.create(Post, {title}) 
//         await em.persistAndFlush(post)
//         return post;
//     }

//     //update post
//     @Mutation(()=> Post, {nullable: true})
//     async updatePost(
//         @Arg('id') id: number,
//         @Arg('title', ()=> String, { nullable: true}) title: string, //can make optional fields nullable
//         @Ctx() { em }: MyContext
//     ): Promise<Post | null> { 
//         const post = await em.findOne(Post, { id }); //fetch post based on id
//         if (!post) {
//             return null;
//         }
//         if (typeof title !== 'undefined') {
//             post.title = title;
//             await em.persistAndFlush(post);
//         }
//         return post;
//     }

//     //delete post
//     @Mutation(()=> Boolean)
//     async deletePost(
//         @Arg('id') id: number,
//         @Ctx() { em }: MyContext
//     ): Promise<boolean> { 
//         try {
//             await em.nativeDelete(Post, {id});
//         } catch {
//             return false;
//         }
//         return true;
//     }
// }