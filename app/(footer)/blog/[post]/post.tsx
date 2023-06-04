"use client";
import React from "react";
import { Blogpost } from "~src/components/blogpost";
import { getBlogs } from "~app/(footer)/blog/blog";

interface PostProps {
    index: number;
}

export const Post: React.FunctionComponent<PostProps> = ({ index }) => {
    const blogs = getBlogs();
    return <Blogpost post={blogs[index]} />;
};
