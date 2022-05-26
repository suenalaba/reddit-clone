import { InputType, Field } from "type-graphql";


@InputType()
export class UsernamePassWordInput {
    @Field()
    email: string;
    @Field()
    username: string;
    @Field()
    password: string;
}
