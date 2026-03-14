import NextLink from 'next/link';
import { ComponentProps } from 'react';

type LinkProps = ComponentProps<typeof NextLink>;

export default function Link({ prefetch = false, ...props }: LinkProps) {
    return <NextLink prefetch={prefetch} {...props} />;
}
