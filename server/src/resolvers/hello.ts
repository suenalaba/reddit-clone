import { Resolver, Query } from "type-graphql";

@Resolver()
export class HelloResolver {
    //create a class and decorate it with resolver
    @Query(()=> String) //need to specify what query returns
    hello() { //graph ql query, in this case scheme
        //is a single query, just hello
        return "im here again"
    }
}