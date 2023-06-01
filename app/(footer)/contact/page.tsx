import { Metadata } from "next";
import { Contact } from "./contact";

export const metadata: Metadata = {
    title: "Contact",
    description: "Here's how to contact the team",
};

export default function ContactPage() {
    return <Contact />;
}
