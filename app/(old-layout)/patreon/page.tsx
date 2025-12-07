import React from "react";
import buildMetadata from "~src/utils/metadata";
import PatronPage from "~app/(old-layout)/patron/page";

export const revalidate = 0;
export default async function PatreonPage() {
    return <PatronPage />;
}

export const metadata = buildMetadata({
    title: "Support",
    description:
        "Like The Run and find it useful? Consider supporting it today by becoming a Patron and get some visual perks for doing so!",
});
