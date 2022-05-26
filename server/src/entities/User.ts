//for typeorm
import { BaseEntity, Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Field, ObjectType } from "type-graphql";
import { Post } from './Post';
import { Updoot } from './Updoot';

@ObjectType()
@Entity()
export class User extends BaseEntity {

    @Field()
    @PrimaryGeneratedColumn()
    id!: number;

    @Field()
    @Column({ unique: true }) //usernames must be unique
    username!: string;

    @Field()
    @Column({ unique: true })
    email!: string;
    //now in development we can just wipe data, but if we are in production not a good idea to wipe all data
    //instead we can type: 'text', unique: true, nullable: true i.e. make email a null field

    // @Field() disallowing access to field encapsulation 
    @Column()
    password!: string;

    //1 user has many posts.
    @OneToMany(() => Post, post => post.creator)
    posts: Post[]; //name of this field should match in Post.ts
    //no need id cause there isn't going to be one.

    @OneToMany(() => Updoot, (updoot) => updoot.user)
    updoots: Updoot[];

    @Field(() => String)
    @CreateDateColumn()
    createdAt: Date;

    @Field(() => String)
    @UpdateDateColumn()
    updatedAt: Date;
}

//this is for mikro-orm

// import { Entity, OptionalProps, PrimaryKey, Property } from "@mikro-orm/core";
// import { Field, ObjectType } from "type-graphql";

// @ObjectType()
// @Entity()
// export class User {

//     [OptionalProps]?: 'createdAt' | 'updatedAt';

//     @Field()
//     @PrimaryKey()
//     id!: number;

//     @Field(() => String)
//     @Property()
//     createdAt: Date = new Date();

//     @Field(() => String)
//     @Property({ onUpdate: () => new Date() })
//     updatedAt: Date = new Date();

//     @Field()
//     @Property({type: 'text', unique: true}) //usernames must be unique
//     username!: string;

//     @Field()
//     @Property({type: 'text', unique: true})
//     email!: string;
//     //now in development we can just wipe data, but if we are in production not a good idea to wipe all data
//     //instead we can type: 'text', unique: true, nullable: true i.e. make email a null field

//     // @Field() disallowing access to field encapsulation 
//     @Property({type: 'text'})
//     password!: string;
// }