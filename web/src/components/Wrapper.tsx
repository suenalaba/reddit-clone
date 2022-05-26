import { Box } from "@chakra-ui/react";

export type WrapperVariant = "small" | "regular"

//in typescript, what we want react props to be, single prop accepted: variant-> small/regular
interface WrapperProps {
    variant?: WrapperVariant;
}

//default variant to be regular.
export const Wrapper: React.FC<WrapperProps> = ({ 
    children, 
    variant='regular', //destructuring prop
}) => {
    return (
        //max width 800px, width 100%, margin top 8 to bring it up, margin in x direction auto
        <Box 
            mt={8} 
            mx="auto" 
            maxW={variant === 'regular' ? "800px": "400px"} 
            w="100%"
        >
            {children}
        </Box>
    );
}