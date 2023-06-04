import { Metadata } from "next";
import { Blog } from "./blog";

export const metadata: Metadata = {
    title: "Blog",
    description: "Blog for The Run",
};

export default function BlogPage() {
    return <Blog />;
}
