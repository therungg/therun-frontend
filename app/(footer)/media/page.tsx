import { Metadata } from "next";
import { Media } from "./media";

export const metadata: Metadata = {
    title: "Media",
    description: "Media Kit for The Run",
};

export default function MediaPage() {
    return <Media />;
}
