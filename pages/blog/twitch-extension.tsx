import { Blogpost } from "../../components/blogpost";
import { getBlogs } from "../blog";

export const TwitchExtension = () => {
    return <Blogpost post={getBlogs()[1]} />;
};

export default TwitchExtension;
