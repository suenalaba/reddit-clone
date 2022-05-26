import { withUrqlClient } from "next-urql";
import { createUrqlClient } from "../utils/createUrqlClient";
import { useDeletePostMutation, useMeQuery, usePostsQuery } from "../generated/graphql";
import { Layout } from "../components/Layout";
import NextLink from 'next/link';
import { Box, Button, Flex, Heading, Icon, IconButton, Link, Stack, Text } from "@chakra-ui/react";
import { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon, DeleteIcon, EditIcon } from "@chakra-ui/icons";
import { UpdootSection } from "../components/UpdootSection";
import { EditDeletePostButtons } from "../components/EditDeletePostButtons";
const Index = () => {
  const [variables, setVariables] = useState({
    limit: 15, 
    cursor: null as null | string,
  });


  const [{data, error, fetching}] = usePostsQuery({ //we dont wanna load more when fetching
    variables,
  });



  //couple of states to consider
  if (!fetching && !data) {
    return (
      <div>
        <div>you got query failed for some reason</div>
        <div>{error?.message}</div>
      </div>
    )
  }
  return (
    <Layout>
      {/* <Flex align="center">
        <Heading>LiReddit</Heading>
        <NextLink href="/create-post">
          <Link ml="auto">create post</Link>
        </NextLink>
      </Flex>
      <br/> */}
      {/* if no data then display null else display data we have */}
      {fetching && !data ? (
        <div>loading...</div>
        ) : (
          <Stack spacing={8}>
            {data!.posts.posts.map((p) => 
              !p ? null : ( //add ! to say it will definitely not be undefined
                <Flex key={p.id} p={5} shadow="md" borderWidth="1px">
                  <UpdootSection post={p} />
                  <Box flex={1}>
                    {/* href is page name, as is the dynamic data we want to pass in */}
                    <NextLink href="/post/[id]" as={`/post/${p.id}`}>
                      <Link>
                        <Heading fontSize="xl">{p.title}</Heading>
                      </Link>
                    </NextLink>
                    <Text>posted by {p.creator.username}</Text>
                    <Flex align="center">
                      <Text flex={1} mt={4}>{p.textSnippet}</Text>
                      <Box ml="auto">
                        <EditDeletePostButtons 
                          id={p.id} 
                          creatorId={p.creator.id}>
                        </EditDeletePostButtons>
                      </Box>
                    </Flex>
                  </Box>
                </Flex>
              ))}
          </Stack>
        )} 
        {data && data.posts.hasMore ? (
          <Flex>
            {/* to center it can just add flex */}
            {/* only want to show load more button only if we have data */}
            <Button 
              onClick={() => {
                setVariables({
                  limit: variables.limit,
                  cursor: data.posts.posts[data.posts.posts.length-1].createdAt, //get all data after the cursor.
                });
              }} 
              isLoading={fetching} m="auto" my={8}>
              load more
            </Button>
          </Flex>
        ) : null}
    </Layout>
  );
};
//set up urql provider only, must put ssr: true to set up server side rendering
//non ssr rendering meaning get request from browser only
export default withUrqlClient(createUrqlClient, {ssr: true})(Index);