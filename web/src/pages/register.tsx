import React from 'react';
import { Formik, Form } from 'formik';
import { Box, Button, } from '@chakra-ui/react';
// import { setValues } from 'framer-motion/types/render/utils/setters';
import { Wrapper } from '../components/Wrapper';
import { InputField } from '../components/InputField';
// import { useMutation } from 'urql';
import { useRegisterMutation } from '../generated/graphql';
import { toErrorMap } from '../utils/toErrorMap';
import { useRouter } from "next/router";
import { createUrqlClient } from '../utils/createUrqlClient';
import { withUrqlClient } from 'next-urql';

interface registerProps {

}

// const REGISTER_MUT = `mutation Register($username : String!, $password: String! ) {
//     register(options: {username: $username, password: $password}) {
//       errors {
//         field
//         message
//       }
//       user {
//         id
//         createdAt
//         updatedAt
//         username
//       }
//     }
//   }`

export const Register: React.FC<registerProps> = ({}) => {
    // const [, register] = useMutation(REGISTER_MUT)
    const router = useRouter();
    const [, register] = useRegisterMutation();
    return (
        <Wrapper variant='small'>
            <Formik 
                initialValues = {{ email: "", username: "", password: "" }}
                onSubmit = {async ( values, {setErrors} ) => {
                    const response = await register({ options: values });
                    if (response.data?.register.errors) {
                        //question mark, if data doesn't exist, it will not throw error but rather undefined.
                        setErrors(toErrorMap(response.data.register.errors));
                        //dont need question mark here, because typescript infer it is defined due to if statement
                    } else if (response.data?.register.user) {
                        //if no error navigate to landing page
                        router.push("/");
                    }
                    // console.log(values);
                    // return register(values);
                    // register({username: values.username}) //need to specify if dont line up exactly
                }}
            >
                {({ isSubmitting }) => (
                    <Form>
                        {/* <FormControl>
                            <FormLabel htmlFor='username'>Username</FormLabel>
                            <Input 
                                value={values.username}
                                onChange={handleChange}
                                id="username"
                                placeholder="username">
                            </Input>
                        </FormControl> */}
                        <InputField
                            name="username"
                            placeholder="username"
                            label="Username"
                        />
                        <Box mt={4}>
                            <InputField
                                name="email"
                                placeholder="email"
                                label="Email"
                            />
                        </Box>
                        <Box mt={4}>
                            <InputField
                                name="password"
                                placeholder="password"
                                label="Password"
                                type="password"
                            />
                        </Box>
                        <Button mt={4} type='submit' isLoading={isSubmitting} colorScheme='teal'>register</Button>
                    </Form>
                )}
            </Formik>
        </Wrapper>
      );
}

//need to wrap with urql, but can decide if we want the page to be ssr true or false.
export default withUrqlClient(createUrqlClient)(Register);
