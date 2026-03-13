'use client';
import React from 'react';
import { getBlogs } from '~app/(new-layout)/blog/blog';
import { Blogpost } from '~src/components/blogpost';

interface PostProps {
    index: number;
}

export const Post: React.FunctionComponent<PostProps> = ({ index }) => {
    const blogs = getBlogs();
    return <Blogpost post={blogs[index]} />;
};
