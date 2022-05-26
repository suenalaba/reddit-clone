import { Column, Entity, BaseEntity, ManyToOne, PrimaryColumn } from "typeorm";
import { Post } from "./Post";
import { User } from "./User";

// m to n relationship/ many-many relationship
// user <-> posts
//several users can upvote same post. 
//users can upvote many post.
// user -> join table(updoot) <- posts //join table dont need primary generated column
//only need primary column that is based off a foreign key.

//decorators are stackable
// @ObjectType() //entity not a graphql type so need to pass graphql type, with this can turn class into graphql type
@Entity() //correspond to database table.
export class Updoot extends BaseEntity {

    // @Field()
    @Column({ type: "int" })
    value: number; //track upvote or downvote

    // @Field()
    @PrimaryColumn()
    userId: number;

    //many updoots to one user
    //set up foreign key to the user's table, store foreign key in creatorId
    // @Field(() => User)
    @ManyToOne(() => User, user => user.updoots) //name in User.ts should match the user.updoots we put here.
    user: User;

    // @Field()
    @PrimaryColumn()
    postId: number;

    // @Field(() => Post)
    @ManyToOne(() => Post , (post) => post.updoots, {
        onDelete: "CASCADE", //cascade delete if post delete, all the updoot delete as well
    })
    post: Post;

}
