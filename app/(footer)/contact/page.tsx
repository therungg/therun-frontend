import { Contact } from "./contact";
import buildMetadata from "~src/utils/metadata";

export const metadata = buildMetadata({
    title: "Contact",
    description: "Contact the team with your question, comments, or concerns.",
});

export default function ContactPage() {
    return <Contact />;
}
