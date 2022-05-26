import { Field, Int, ObjectType } from "type-graphql";
import { Column, CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn, Entity, BaseEntity, ManyToOne, OneToMany } from "typeorm";
import { Updoot } from "./Updoot";
import { User } from "./User";

//decorators are stackable
@ObjectType() //entity not a graphql type so need to pass graphql type, with this can turn class into graphql type
@Entity() //correspond to database table.
export class Post extends BaseEntity {

    @Field() //int and string auto inferred
    @PrimaryGeneratedColumn()
    id!: number;

    @Field(() => Int, {nullable: true}) //no need column as we will not be storing in the database
    voteStatus: number | null; //only graphql schema value
    //1 means upvoted, -1 means downvoted, null means not voted

    @Field()
    @Column()
    creatorId: number;

    //many posts to one user
    //set up foreign key to the user's table, store foreign key in creatorId
    @Field()
    @ManyToOne(() => User, user => user.posts) //name in User.ts should match the user.posts we put here.
    creator: User;

    @OneToMany(() => Updoot, (updoot) => updoot.post)
    updoots: Updoot[];

    @Field()
    @Column()
    title!: string;

    @Field()
    @Column()
    text!: string;

    @Field() 
    @Column({ type: "int", default: 0 })
    points: number;

    @Field(() => String) //need to explicitly set type for non string/int. 
    @CreateDateColumn() //denote database column, without it its just a class attribute
    createdAt: Date;

    @Field(() => String)
    @UpdateDateColumn()
    updatedAt: Date;
}

//this is for mikro-orm

// import { Entity, OptionalProps, PrimaryKey, Property } from "@mikro-orm/core";
// import { Field, ObjectType } from "type-graphql";

// //decorators are stackable
// @ObjectType() //entity not a graphql type so need to pass graphql type, with this can turn class into graphql type
// @Entity() //correspond to database table.
// export class Post {

//     [OptionalProps]?: 'createdAt' | 'updatedAt';

//     @Field() //int and string auto inferred
//     @PrimaryKey()
//     id!: number;
//     //doesnt work with latest version of MikroOrm.
//     // @Property({ type: 'date'})
//     // createdAt = new Date();

//     // @Property({ type: 'date', onUpdate: () => new Date() })
//     // updatedAt = new Date();

//     @Field(() => String) //need to explicitly set type for non string/int. 
//     @Property() //denote database column, without it its just a class attribute
//     createdAt: Date = new Date();

//     @Field(() => String)
//     @Property({ onUpdate: () => new Date() })
//     updatedAt: Date = new Date();

//     @Field() //comment out field to not expose field, encapsulation.
//     @Property({type: 'text'})
//     title!: string;
// }