import { Blogpost } from "../../components/blogpost";
import { getBlogs } from "../blog";

export const WelcomeToTheRun = () => {
    return <Blogpost post={getBlogs()[0]} />;
};

export default WelcomeToTheRun;
