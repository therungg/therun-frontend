import { Faq } from "./faq";
import buildMetadata from "~src/utils/metadata";

export const metadata = buildMetadata({
    title: "Frequently Asked Questions",
    description:
        "Get some answers to some frequently asked questions about The Run.",
});

export default function FAQPage() {
    return <Faq />;
}
