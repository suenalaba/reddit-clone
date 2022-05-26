import { Request, Response } from "express";
import { Redis } from "ioredis"
import { createUpdootLoader } from "./utils/createUpdootLoader";
import { createUserLoader } from "./utils/createUserLoader";


export type MyContext = {
    // em: EntityManager<any> & EntityManager<IDatabaseDriver<Connection>>;
    req: Request & { session: Express.Session };
    redis: Redis;
    res: Response;
    userLoader: ReturnType<typeof createUserLoader>; //to auto get back the type we can use this typescript function
    updootLoader: ReturnType<typeof createUpdootLoader>; 
}