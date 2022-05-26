import { ChakraProvider } from '@chakra-ui/react';
// import { AppProps } from 'next/app'
import theme from '../theme';


//helper function to cast types because urql different from apollo
//allow us to properly cast the type
// function betterUpdateQuery<Result, Query>(
//   cache: Cache,
//   qi: QueryInput,
//   result: any,
//   fn: (r: Result, q: Query) => Query,
// ) {
//   return cache.updateQuery(qi, (data) => fn(result, data as any) as any);
// }

// const client = createClient({ 
//   url: 'http://localhost:4000/graphql',
//   fetchOptions: {
//     credentials: "include",
//   },
//   //update the cache, me query when it runs. Basically update the query whenever a mutation fires.
//   exchanges: [dedupExchange, 
//     cacheExchange({
//       updates: {
//         Mutation: {
//           //cache the logout
//           //in our app we dont want to remove all user data, eg some posts we want them to remain public
//           logout: (_result, args, cache, info) => {
//             // cache.invalidate() //we dont want this cause we dont want to invalidate user we just wanna log them out
//             //me query we want it to return null, so we just need to update the query.
//             betterUpdateQuery<LogoutMutation, MeQuery>(
//               cache,
//               {query: MeDocument},
//               _result,
//               //any listener listening to get current user info, will infer that no user is logged in because we set me value to null
//               () => ({me: null}) //result,query not needed since returning null
//             );
//           },
//           login: (_result, args, cache, info) => {
//             // cache.updateQuery({ query: MeDocument }, (data: MeQuery) => {});
//             betterUpdateQuery<LoginMutation, MeQuery>(cache, 
//               { query: MeDocument },
//               _result,
//               (result, query) => {
//                 if (result.login.errors) {
//                   return query;
//                 } else {
//                   return {
//                     me: result.login.user,
//                   };
//                 }
//               }
//             );
//           },

//           register: (_result, args, cache, info) => {
//             // cache.updateQuery({ query: MeDocument }, (data: MeQuery) => {});
//             betterUpdateQuery<RegisterMutation, MeQuery>(cache, 
//               { query: MeDocument },
//               _result,
//               (result, query) => {
//                 if (result.register.errors) {
//                   return query;
//                 } else {
//                   return {
//                     me: result.register.user,
//                   };
//                 }
//               }
//             );
//           },
//         },
//       }
//   }), fetchExchange]
// });

function MyApp({ Component, pageProps }: any) { //AppProps or any return type
  return (
      <ChakraProvider resetCSS theme={theme}>
        <Component {...pageProps} />
      </ChakraProvider>
  );
}

export default MyApp
