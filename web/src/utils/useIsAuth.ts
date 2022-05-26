import { useRouter } from "next/router";
import { useEffect } from "react";
import { useMeQuery } from "../generated/graphql";

export const useIsAuth = () => {
  //when you land on this page, check if you login via meQuery, if logged nothing, else take you to login page.
  const [{data, fetching}] = useMeQuery(); //need to take int account loading because when loading it will be false.
  const router = useRouter();
  useEffect(() => {
    if(!fetching && !data?.me) {
      router.replace("/login?next=" + router.pathname); //tell login page where to go after they login
      //login?next=/create-post in the url is called a query parameter so we need to teach
      //login page how to read this
    }
  }, [fetching, data, router]);
}