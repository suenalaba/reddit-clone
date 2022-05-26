import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';
import { Flex, IconButton } from '@chakra-ui/react';
import React, { useState } from 'react'
import { PostSnippetFragment, PostsQuery, useVoteMutation } from '../generated/graphql';

interface UpdootSectionProps {
  // points: number
  post: PostSnippetFragment; //selecting type post inside another type post, single element so [0]; //can use fragment to optimise.
} //using post directly we can fetch all elements if we want and not just the points

//note after completing the the loading etc need to update cache to reflect change immediately 
// & do not allow users to upvote a post they already upvoted.

export const UpdootSection: React.FC<UpdootSectionProps> = ({ post }) => {
  const [loadingState, setLoadingState] = useState<'updoot-loading' | 'downdoot-loading' | 'not-loading'>('not-loading');
  const [, vote] = useVoteMutation();
  return (
    <Flex direction="column" justifyContent="center" alignItems="center" mr={4}>
      <IconButton 
        onClick={async () => {
          if (post.voteStatus === 1) {
            return; //do nothing don't allow multiple clicks
          }
          setLoadingState('updoot-loading')
          await vote({
            postId: post.id,
            value: 1,
          });
          setLoadingState('not-loading')
        }}
        colorScheme = {post.voteStatus === 1 ? "green" : undefined }
        isLoading={loadingState==='updoot-loading'}
        aria-label='updoot post' 
        icon={<ChevronUpIcon />}
      />
      {post.points}
      <IconButton 
        onClick={async () => {
          if (post.voteStatus === -1) {
            return; //do nothing don't allow multiple clicks
          }
          setLoadingState('downdoot-loading')
          await vote({
            postId: post.id,
            value: -1,
          });
          setLoadingState('not-loading')
        }}
        colorScheme = {post.voteStatus === -1 ? "red" : undefined }
        isLoading={loadingState==='downdoot-loading'}
        aria-label='downdoot post' 
        icon={<ChevronDownIcon />}
      />
    </Flex>
  );
}