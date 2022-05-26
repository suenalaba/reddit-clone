import { Cache, QueryInput } from "@urql/exchange-graphcache";

//helper function to cast types because urql different from apollo
//allow us to properly cast the type
export function betterUpdateQuery<Result, Query>(
  cache: Cache,
  qi: QueryInput,
  result: any,
  fn: (r: Result, q: Query) => Query,
) {
  return cache.updateQuery(qi, (data) => fn(result, data as any) as any);
}