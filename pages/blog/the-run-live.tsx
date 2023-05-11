import { Blogpost } from "../../components/blogpost";
import { getBlogs } from "../blog";

export const LivesplitBlog = () => {
    return <Blogpost post={getBlogs()[2]} />;
};

export default LivesplitBlog;
