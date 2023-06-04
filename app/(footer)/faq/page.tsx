import { Metadata } from "next";
import { Faq } from "./faq";

export const metadata: Metadata = {
    title: "FAQ",
    description: "Frequently asked questions about The Run",
};

export default function FAQPage() {
    return <Faq />;
}
