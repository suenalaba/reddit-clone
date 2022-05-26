import React, { useState } from 'react'
import { createUrqlClient } from '../utils/createUrqlClient';
import { withUrqlClient } from "next-urql";
import { Wrapper } from '../components/Wrapper';
import { Form, Formik } from 'formik';
import { InputField } from '../components/InputField';
import { Box, Button, Flex, Link } from '@chakra-ui/react';
import { useForgotPasswordMutation } from '../generated/graphql';

export const ForgotPassword: React.FC<{}> = ({}) => {
  const [complete, setComplete] = useState(false); //toggle state when complete, false default
  const [, forgotPassword] = useForgotPasswordMutation();
    return (<Wrapper variant='small'>
    <Formik 
        initialValues = {{ email: "" }}
        onSubmit = {async ( values ) => {
            const response = await forgotPassword(values);
            setComplete(true);
        }}
    >
        {({ isSubmitting }) => 
          complete ? ( 
            <Box>
              if an account with that email exists, we sent you an email
            </Box>
          ) : (
            <Form>
              <InputField
                  name="email"
                  placeholder="email"
                  label="Email"
                  type="email"
              />
              <Button 
                mt={4} 
                type='submit' 
                isLoading={isSubmitting} 
                colorScheme='teal'
              >
                forgot password
              </Button>
            </Form>
        )}
    </Formik>
</Wrapper>);
}

export default withUrqlClient(createUrqlClient)(ForgotPassword);