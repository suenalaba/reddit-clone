import { __prod__ } from "./constants";
import { Post } from "./entities/Post";
import { MikroORM} from "@mikro-orm/core";
import path from 'path';
import { User } from "./entities/User";

export default  {
    migrations: {
        path: path.join(__dirname, "./migrations"), //dirname is absolute path 
        pattern: /^[\w-]+\d+\.[tj]s$/,
    },
    allowGlobalContext: true,
    entities: [Post, User], //stores database table
    dbName: 'lireddit',
    user: 'postgres',
    password: "postgres",
    type: 'postgresql',
    debug: !__prod__ //when not in production I want debugging to be on
} as Parameters<typeof MikroORM.init>[0]; //get the type that init expects for its first character
