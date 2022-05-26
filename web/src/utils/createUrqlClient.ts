import { dedupExchange, Exchange, fetchExchange, stringifyVariables } from "urql";
import { cacheExchange, Resolver, Cache } from "@urql/exchange-graphcache";
import { LogoutMutation, MeQuery, MeDocument, LoginMutation, RegisterMutation, VoteMutation, VoteMutationVariables, DeletePostMutationVariables } from "../generated/graphql";
import { betterUpdateQuery } from "./betterUpdateQuery";
import { pipe, tap } from "wonka";
import Router from 'next/router';
import { gql } from '@urql/core';
import { isServer } from "./isServer";

//global error handler
const errorExchange: Exchange = ({ forward }) => ops$ => {
  return pipe(
    forward(ops$),
    tap(({ error }) => {
      if (error?.message.includes("Not authenticated"))  {
        Router.replace("/login"); //replaces the current route in the history rather than push on new entry
        //the purpose of replace is redirect
      }
    })
  );
};

const cursorPagination = (): Resolver => {
  return (_parent, fieldArgs, cache, info) => {
    const { parentKey: entityKey, fieldName } = info;
    const allFields = cache.inspectFields(entityKey); //inspect field get all the query in the cache
    const fieldInfos = allFields.filter((info) => info.fieldName === fieldName);
    const size = fieldInfos.length;
    if (size === 0) {
      return undefined; //if there is no data, cache miss return undefined
    }

    //check if there is data from the cache and return it. readQuery() will call resolver and will lead to infinite loop

    const fieldKey = `${fieldName}(${stringifyVariables(fieldArgs)})`;
    const isItInTheCache = cache.resolve( //fetch if post in the cache, check that.
      cache.resolveFieldByKey(entityKey, fieldKey) as string,
      "posts"
    );
    info.partial = !isItInTheCache; //fetch more data from server that is not already in the cache
    let hasMore = true; //default true it has more to fetch
    const results: string[] = [];
    //loop through all of the cache and look for any paginated queries
    fieldInfos.forEach((fi) => { //loop through cache and get all data and store in the list
      const key = cache.resolveFieldByKey(entityKey, fi.fieldKey) as string; //return string array, tells us whether info is in cache
      const data = cache.resolve(key, "posts") as string[];
      //server needs to tell the client/ui we are out of data.
      const _hasMore = cache.resolve(key, "hasMore");
      if (!_hasMore) {
        hasMore = _hasMore as boolean;
      }
      results.push(...data);
    });

    return {
      __typename: "PaginatedPosts",
      hasMore, //true or false
      posts: results,
    };
  };
};

function invalidateAllPosts(cache: Cache) {
  //filter by posts get all the argument and invalidate all of them.
  const allFields = cache.inspectFields("Query"); //inspect field get all the query in the cache
  const fieldInfos = allFields.filter((info) => info.fieldName === 'posts');
  fieldInfos.forEach((fi) => {
    cache.invalidate("Query", "posts", fi.arguments || {});
  });
}

//gets run on the server at one point ssrExchange.
export const createUrqlClient = (ssrExchange: any, ctx: any) => { 
  
  // console.log(ctx); //to see context need to add return statement and console.log.
  let cookie = ''
  //ctx.req.headers.cookie //only available to us when on the server. code runs on BOTH browser and next js server
  if (isServer()) { //therefore need to check isServer.
    // cookie = ctx.req.headers.cookie;
    //to solve hot module refresh loading issue, can do optional chaining
    cookie = ctx?.req?.headers?.cookie;
  }

  return ({

  url: 'http://localhost:4000/graphql',
  fetchOptions: {
    credentials: "include" as const,
    headers: cookie //send cookie to graphql api by including it in the header
    ? {
      cookie,
    } 
    : undefined //if have cookie pass cookie if not no need pass anything
  },
  //update the cache, me query when it runs. Basically update the query whenever a mutation fires.
  exchanges: [dedupExchange, 
    cacheExchange({
      keys: {
        PaginatedPosts: () => null, //could have put alternate for the id.
      },
      resolvers: {
        Query: {
          posts: cursorPagination(), //client side reoslvers //match posts.graphql query
        },
      },
      updates: {
        Mutation: {
          //to update cache upon delete
          deletePost: (_result, args, cache, info) => {
            cache.invalidate({ //by default will make post null therefore need go index tsx add !p ? null : else display post
              //cannot just delete like that, cause we need to delete all the updoot downdoot if any from the post
              //before we can delete the post to due to the table join
              //or we can cascade delete
              __typename: "Post", 
              id: (args as DeletePostMutationVariables).id,
            })
          },
          vote: (_result, args, cache, info) => {
            const {postId, value} = args as VoteMutationVariables;
            const data = cache.readFragment( //data we are selecting
              gql`
                fragment _ on Post {
                  id
                  points
                  voteStatus 
                }
              `,
              { id: postId } as any //look up by postId
            );
            //possible to get bad post id, so we need data from the cache to check
            if (data) {
              if (data.voteStatus === args.value) {
                return; //if vote status is 1, and we are trying to upvote with 1, don't do anything
              }
              const newPoints = (data.points as number) + ((!data.voteStatus ? 1 : 2) * value);
              //if havent voted before 1 or -1, if voted before -> switching vote so -2 or + 2
              cache.writeFragment( //updating points
                gql`
                  fragment __ on Post {
                    points
                    voteStatus
                  }
                `,
                { id: postId, points: newPoints, voteStatus: value} as any //update post id with the new points
              );
            }
          },
          //invalidate query and it will refetch it from the server.
          //so that when we create a new post it will appear at the top without having to refresh.
          createPost: (_result, args, cache, info) => {
            //abstract invalidate cache into function
            invalidateAllPosts(cache);
            // cache.invalidate('Query', 'posts', { //refetch data from the cache. it will reload data from server.
            //   // variables: {
            //   //   limit: 15,
            //   //   // cursor: null, //remove this to invalidate successfully.
            //   // },
            //   limit: 15, // no need pass in variables.
            // });
            //can console.log this from start and end to see what's wrong cache.inspectFields('Query')
          },
          //cache the logout
          //in our app we dont want to remove all user data, eg some posts we want them to remain public
          logout: (_result, args, cache, info) => {
            // cache.invalidate() //we dont want this cause we dont want to invalidate user we just wanna log them out
            //me query we want it to return null, so we just need to update the query.
            betterUpdateQuery<LogoutMutation, MeQuery>(
              cache,
              {query: MeDocument},
              _result,
              //any listener listening to get current user info, will infer that no user is logged in because we set me value to null
              () => ({me: null}) //result,query not needed since returning null
            );
          },
          login: (_result, args, cache, info) => {
            // cache.updateQuery({ query: MeDocument }, (data: MeQuery) => {});
            betterUpdateQuery<LoginMutation, MeQuery>(cache, 
              { query: MeDocument },
              _result,
              (result, query) => {
                if (result.login.errors) {
                  return query;
                } else {
                  return {
                    me: result.login.user,
                  };
                }
              }
            );
            invalidateAllPosts(cache); //to reset the cache invalidate all the query to refetch the data.
          },

          register: (_result, args, cache, info) => {
            // cache.updateQuery({ query: MeDocument }, (data: MeQuery) => {});
            betterUpdateQuery<RegisterMutation, MeQuery>(cache, 
              { query: MeDocument },
              _result,
              (result, query) => {
                if (result.register.errors) {
                  return query;
                } else {
                  return {
                    me: result.register.user,
                  };
                }
              }
            );
          },
        },
      }
  }), 
    errorExchange, 
    ssrExchange,
    fetchExchange, //fetch exchange should usually be the last
  ],
});
}
