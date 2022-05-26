import { Box, Button } from '@chakra-ui/react';
import { Formik, Form } from 'formik';
import { withUrqlClient } from 'next-urql';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react'
import { InputField } from '../components/InputField';
import { Layout } from '../components/Layout';
import { useCreatePostMutation, useMeQuery } from '../generated/graphql';
import { createUrqlClient } from '../utils/createUrqlClient';
import { useIsAuth } from '../utils/useIsAuth';


const CreatePost: React.FC<{}> = ({}) => {
  const router = useRouter();
  useIsAuth(); //to check user authentification.
  const[, createPost] = useCreatePostMutation();
    return (
      <Layout variant='small'>
        <Formik 
                initialValues = {{ title: '', text: '' }}
                onSubmit = {async ( values ) => {
                  // console.log(values) //good practice is just console log to see presentation format
                  //so we know how to access the data we want
                  const {error} = await createPost({ input: values });
                  console.log(error);
                  if (!error) {
                    router.push("/"); //no error then just push to home route
                  } //else if got error global route handler will handle.
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
                        <Button mt={4} type='submit' isLoading={isSubmitting} colorScheme='teal'>create post</Button>
                    </Form>
                )}
            </Formik>
      </Layout>
    );
};

export default withUrqlClient(createUrqlClient)(CreatePost);