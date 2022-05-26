import { Box, Button, Flex, Heading, Link } from '@chakra-ui/react';
import React from 'react';
import NextLink from 'next/link'; //for client side routing
import { useLogoutMutation, useMeQuery } from '../generated/graphql';
import { isServer } from '../utils/isServer';
import { useRouter } from 'next/router'

interface NavBarProps {

}

//loading login not logged in, 3 states
export const NavBar: React.FC<NavBarProps> = ({}) => {

  const router = useRouter();

  const [{fetching: logoutFetching}, logout] = useLogoutMutation(); //fetching is to show -> loading
  //if name fetching - fetching will have name conflict so can use fetching: logoutFetching to remove name conflict
  const [{data, fetching}] = useMeQuery({
    pause: isServer() //tell it to not run on the server but run on browser only //can remove when we fwd cookie.
  }); //we will useMeQuery whenever we want to get current user.
  let body = null;
  if (fetching) {
    //data is loading
    body = null;
    
  } else if (!data?.me) {
    //user not logged in
    //need to wrap in fragment <></>, because we have 2 links next to each other
    body = (
      <> 
        <NextLink href="/login">
            <Link color = 'black' mr={2}>login</Link>
          </NextLink>
          <NextLink href="/register">
            <Link color = 'black'>register</Link>
          </NextLink>
      </>
    );

  } else {
    //user is logged in
    //use flex to display side by side
    body = (
      <Flex align="center">
        <NextLink href="/create-post">
          {/* <Link mr={2}>create post</Link> */}
          {/* i want it to look like a button but it is like a link. */}
          <Button as={Link} mr={4}> 
            create post
          </Button>
        </NextLink>
        <Box mr={2}>{data.me.username}</Box>
        <Button onClick={async () => {
          await logout(); //await because we want to wait until logout finish then reload.
          //upon logout refresh the page to reset the cache
          router.reload();
        }} 
        isLoading = {logoutFetching} //disable button while logging out
        variant="link">logout</Button>
      </Flex>
    )
  };
  return (
    //sticky it so cannot scroll pass navbar
      <Flex zIndex={1} position="sticky" top={0} bg='tan' p={4} align="center">
        {/* make text in navbar align with post box length, add new flex */}
        <Flex flex={1} margin="auto" align="center" maxW={800}>
          <NextLink href="/">
            <Link>
              <Heading>LiReddit</Heading>
            </Link>
          </NextLink>
          <Box ml={'auto'}>{body}</Box>
        </Flex>
      </Flex>
    );
}