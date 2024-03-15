import { Post } from "./post";

const posts = [
    "welcome-to-the-run",
    "twitch-extension",
    "the-run-live",
    "the-run-racing",
];

export function generateStaticParams() {
    return posts.map((post) => ({ post }));
}

export default function PostPage({ params }: { params: { post: string } }) {
    const { post } = params;
    const postIndex = posts.findIndex((blog) => blog === post);
    return <Post index={postIndex} />;
}
