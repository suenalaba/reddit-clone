import 'reflect-metadata'; //type orm and type graph ql needs this import
import { COOKIE_NAME, __prod__ } from "./constants";
import "dotenv-safe/config"; //read dotenv file and read in env variables, security to ensure all env variables are set
//in production we wont use .env file.
import express from 'express'
import {ApolloServer} from 'apollo-server-express'
import {buildSchema} from 'type-graphql'
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from './resolvers/user';
import cors from 'cors';
import { createConnection } from 'typeorm';

//convert require to import statements
// import redis from 'redis';
import Redis from 'ioredis';
import session from 'express-session';
import connectRedis from 'connect-redis';
import { MyContext } from './types';
import { Post } from './entities/Post';
import { User } from './entities/User';
// import { User } from './entities/User';
// import cors from "cors";
import path from "path";
import { Updoot } from './entities/Updoot';
import { createUserLoader } from './utils/createUserLoader';
import { createUpdootLoader } from './utils/createUpdootLoader';

const main = async () => {
    const conn = await createConnection({
        type: 'postgres',
        // database: 'lireddit2', //replaced with url process env
        // username: 'postgres',
        // password: 'postgres',
        url: process.env.DATABASE_URL,
        logging: true,
        // synchronize: true, //create table automatically without running migration //we dont want to set this to true in production
        migrations: [path.join(__dirname, "./migrations/*")], //specify path where migration is at. * means all files.
        entities: [Post, User, Updoot],
    });
    await conn.runMigrations(); //run migrations that have not been run using type-orm
    // sendEmail('bob@bob.com', 'hello there'); //test email
    
    //when database don't tally cause we add new fields but we don't allow the fields to be null
    //we have to delete the posts already existing in db.
    //set synchronize to false then run: synchro will crash due to conflict
    // await Post.delete({}); //delete all data from db in type orm.

    //set up express server
    const app = express();

    //order matters, redis must put in between app and middleware
    //session middleware will run before apollo middleware
    //import because session middleware will be used inside apollo middleware so it must come first
    const RedisStore = connectRedis(session);
    // const redisClient = redis.createClient(); //for normal redis
    const redis = new Redis(process.env.REDIS_URL); //for IO redis.
    // redisClient.on("error", function (err) {
    //     console.log("Error " + err);
    // });
    // const redisClient: IORedis.Cluster = new IORedis.Cluster([])
    // app.set('trust proxy', process.env.NODE_ENV !== 'production');
    // app.use(
    //     cors({
    //       credentials: true,
    //       origin: [
    //         "https://studio.apollographql.com",
    //         // "http://localhost:3000/graphql",
    //       ],
    //     })
    //   );
    
    //need to get cookies working in a proxy environment, because Engine X sitting in front of API
    app.set('proxy',1); //tell express we have 1 proxy sitting in front

    //cors will apply on routes
    app.use(
        // '/', to declare routes you want cors to run if not it will default apply on all routes
        cors({
            origin: process.env.CORS_ORIGIN,
            credentials: true, //accept credentials
    }))

    app.use(
        session(
            {
                name: COOKIE_NAME, //cookie name for checking
                store: new RedisStore({ 
                    client: redis,
                    disableTouch: true, 
                }),
                // store: new RedisStore({
                //     client: redisClient as any, 
                //     disableTouch: true,
                //   }),
                cookie: {
                    maxAge: 1000* 60 * 60 * 24 * 365 * 10, //10 years
                    httpOnly: true, //cannot access cookie in the frontend for security
                    sameSite: 'lax', //protect csrf 
                    secure: __prod__, // cookie only works in https
                    //might have cookie problems went we have ssr, not forwarding cookie
                    domain: __prod__ ? '.codeponder.com' : undefined,
                },
                saveUninitialized: false, //create a session by default even if I don't store data
                //but we dont need that, we dont want to store empty session, so set to false
                secret: process.env.SESSION_SECRET,
                resave: false,
            }
        )
    )

    const apolloServer = new ApolloServer({
        schema: await buildSchema({
            resolvers: [HelloResolver, PostResolver, UserResolver], //apollo server uses that scheme
            validate: false,
        }),
        //context({req,res}) //also possible
        //function that returns object for the context
        // context: ({ req, res }): MyContext => <MyContext>({ em: orm.em, req, res, redis }), //special object that is accessible by all resolvers
        context: ({ req, res }): MyContext => <MyContext>({ //context runs on every request
            req, 
            res, 
            redis,
            userLoader: createUserLoader(), //new user loader create on every req, so these batches encaches loading of users for a single req.
            updootLoader: createUpdootLoader(),
         }), //no need pass em context for typeorm
    })
    //on start will open a graphql playground devtool 
    await apolloServer.start(); //need to await if not got error
    apolloServer.applyMiddleware({ 
        app,
        cors: false, //we want to create it globally instead
        // cors: { origin: "http://localhost:3000" } //default origin is * therefore error.
     }); //create graphql endpoint on express
    // app.get('/', (_,res) => { //home, request, response, function to put logic
    //     //if want add req use (req,res)
    //     res.send('ben awad is here');
    // })
    // app.listen(4000, () => { //can choose any port.
    //     console.log('server started on localhost: 4000');
    // })
    //use this after setting environment variables
    app.listen(parseInt(process.env.PORT), () => { //can choose any port.
        console.log('server started on localhost: 4000');
    })
    // const post = orm.em.create(Post, {title: "my first post" }); //doesnt work with newest version of Mikro-Orm
    //use this but comment out so dont flood database
    // const post = orm.em.fork({}).create(Post, {
    //     title: "my testing post", //create instance of post
    //   });
    // await orm.em.persistAndFlush(post); //insert into database
    //await orm.em.nativeInsert(Post, {title: 'my first post 2'}); //alternative insertion option
    //this option doesnt create a class, so it doesnt add the date field.

    // const postsInDb = await orm.em.find(Post, {}); //get all posts in the database
    // console.log(postsInDb);
}

main();
