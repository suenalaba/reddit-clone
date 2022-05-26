import { Box, Button } from '@chakra-ui/react';
import { Formik, Form } from 'formik';
import { withUrqlClient } from 'next-urql'
import { useRouter } from 'next/router';
import React from 'react'
import { InputField } from '../../../components/InputField';
import { Layout } from '../../../components/Layout';
import { usePostQuery, useUpdatePostMutation } from '../../../generated/graphql';
import { createUrqlClient } from '../../../utils/createUrqlClient'
import { useGetIntId } from '../../../utils/useGetIntId';

const EditPost = ({}) => {
  const router = useRouter();
  const intId = useGetIntId();
  const [{data, fetching}] = usePostQuery({
    pause: intId == -1, //not an id of any post, bad url parameter. dont send request to the server.
    variables: {
        id: intId
    },
  });
  const[,updatePost] = useUpdatePostMutation();
  if (fetching) {
    return (
      <Layout>
        <div>loading...</div>
      </Layout>
    );
  }

  if (!data?.post) {
    return (
        //by having this clause we need not check data?.post?.title in the main return layout.
        <Layout>
            <Box>
                Could not find post
            </Box>
        </Layout>
    )
  }

  return (
    <Layout variant='small'>
        <Formik 
                initialValues = {{ title: data.post.title, text: data.post.text }}
                onSubmit = {async ( values ) => {
                  await updatePost({id: intId, ...values});
                  router.back();
                  // router.push('/'); //router.back() to return to prev page if you want.
                }}
            >
                {({ isSubmitting }) => (
                    <Form>
                        <InputField
                          name="title"
                          placeholder="title"
                          label="Title"
                        />
                        <Box mt={4}>
                            <InputField
                                textarea //default true
                                name="text"
                                placeholder="text..."
                                label="Body"
                                type="password"
                            />
                        </Box>
                        <Button mt={4} type='submit' isLoading={isSubmitting} colorScheme='teal'>update post</Button>
                    </Form>
                )}
            </Formik>
      </Layout>
  )
};

export default withUrqlClient(createUrqlClient)(EditPost);