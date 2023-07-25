import { Blog } from "./blog";
import buildMetadata from "~src/utils/metadata";

export const metadata = buildMetadata({
    title: "Blog",
    description: "See updates The Run posts about new and upcoming features.",
});

export default function BlogPage() {
    return <Blog />;
}
