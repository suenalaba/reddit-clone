import { Box, Button, Flex, Link } from "@chakra-ui/react";
import { Form, Formik } from "formik";
import { NextPage } from "next";
import { withUrqlClient } from "next-urql";
import { useRouter } from "next/router";
import { useState } from "react";
import { InputField } from "../../components/InputField";
import { Wrapper } from "../../components/Wrapper";
import { useChangePasswordMutation } from "../../generated/graphql";
import { createUrqlClient } from "../../utils/createUrqlClient";
import { toErrorMap } from "../../utils/toErrorMap";
import NextLink from 'next/link'


//take token and user id and send to server via mutation
export const ChangePassword: NextPage<{token: string}> = () => {
  const router = useRouter();
  const [,changePassword] = useChangePasswordMutation();
  const [tokenError, setTokenError] = useState(''); 
    return (
      <Wrapper variant='small'>
        <Formik 
            initialValues = {{ newPassword: "" }}
            onSubmit = {async ( values, {setErrors} ) => {
                const response = await changePassword({
                  newPassword: values.newPassword, 
                  token: typeof router.query.token === 'string' ? router.query.token : "",
                });
                if (response.data?.changePassword.errors) {
                  const errorMap = toErrorMap(response.data.changePassword.errors);
                  //handle the case where token field has error
                  if ('token' in errorMap) {
                    setTokenError(errorMap.token); //pass in error message for tokens
                  }
                  setErrors(errorMap);
                } else if (response.data?.changePassword.user) {
                  router.push("/");
                }
            }}
        >
            {({ isSubmitting }) => (
                <Form>
                    <InputField
                        name="newPassword"
                        placeholder="new password"
                        label="New Password"
                        type="password"
                    />
                    {tokenError? (
                      <Flex>
                        <Box mr={2} color = 'red'>{tokenError}</Box>
                        <NextLink href="/forgot-password">
                          <Link>click here to get a new one</Link>
                        </NextLink> 
                      </Flex> 
                    ): null}
                    <Button 
                      mt={4} 
                      type='submit' 
                      isLoading={isSubmitting} 
                      colorScheme='teal'
                    >
                      change password
                    </Button>
                </Form>
            )}
        </Formik>
    </Wrapper>
  );
}

//get any query parameters and pass to component
//get initial props make the page static and optimise it. so not recommended.
//but if you need to ssr page based on query parameter so we should use this way:
// ChangePassword.getInitialProps = ({ query }) => {
//   return {
//     token: query.token as string
//   }
// }

//whenever we do mutation or query need to add urql client
export default withUrqlClient(createUrqlClient)(ChangePassword);

//can use get server props to run stuff on server. since we can server side render the page