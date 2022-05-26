import { UsernamePassWordInput } from "src/resolvers/UsernamePassWordInput";

export const validateRegister = (options: UsernamePassWordInput) => {
  if (!options.email.includes('@')) {
    // return {
    //     errors: [
    //         {
    //         field: 'email',
    //         message: 'invalid email',
    //         },
    //     ],
    // };
    return [
      {
        field: "email",
        message: "invalid email",
      },
    ];
  }

  //can use validation library for user input validation
  if (options.username.length <= 2) {
      return [
        {
          field: 'username',
          message: 'length must be greater than 2',
        },
    ];
  }

  if (options.username.includes('@')) {
    return [
      {
        field: 'username',
        message: 'cannot include an @',
      },
  ];
}

  if (options.password.length <= 2) {
      return [
        {
          field: 'password',
          message: 'length must be greater than 2',
        },
    ];
  }
  return null;
}