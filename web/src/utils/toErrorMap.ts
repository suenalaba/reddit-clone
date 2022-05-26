import { FieldError } from "../generated/graphql";

//convert array(error message array) to an object
export const toErrorMap = (errors: FieldError[]) => {
  const errorMap: Record<string, string> = {};
  errors.forEach(({field, message}) => {
    errorMap[field] = message;
  })

  return errorMap;
}