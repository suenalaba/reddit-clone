import { FormControl, FormErrorMessage, FormLabel, Input, Textarea } from '@chakra-ui/react';
import { useField } from 'formik';
import React, { InputHTMLAttributes } from 'react'

type InputFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  textarea?: boolean;
};

/**
 * Reusable input field template.
 *
 * @param props props needed label,placeholder & name
 * @returns an input field template
 */
//input field to take props any regular input field will take
export const InputField: React.FC<InputFieldProps> = ({
  label, 
  textarea,
  size: _, //size:, also can take it off props, unused variable put underscore
  ...props
}) => {
  let InputOrTextarea = Input;
  if (textarea) {
    InputOrTextarea = Textarea;
  }
  const [field, {error, }] = useField(props); //this is a hook pass some html attributes
    return (
      <FormControl isInvalid = {!!error}>
        <FormLabel htmlFor={field.name}>{label}</FormLabel>
        <InputOrTextarea {...field} {...props} id = {field.name} placeholder={props.placeholder}/>
        {error ? <FormErrorMessage>{error}</FormErrorMessage> : null}
      </FormControl>
    );
}


//Notes:
// !! means cast to boolean
// '' => false
// 'error message stuff' => true