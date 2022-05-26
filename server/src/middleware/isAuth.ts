import { MyContext } from "../types";
import { MiddlewareFn } from "type-graphql";

//middleware function that wrap our resolver and check if user is authenticated.
export const isAuth: MiddlewareFn<MyContext> = ({context}, next) => {
  if (!context.req.session.userId) {
    throw new Error("Not authenticated");
  }
  return next();
};