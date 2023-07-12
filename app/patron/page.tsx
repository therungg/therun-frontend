import React from "react";
import { PatreonInfo } from "~app/patron/patreon-info";
import { getSession } from "~src/actions/session.action";

export const revalidate = 0;
export default async function PatronPage() {
    const session = await getSession();
    return <PatreonInfo session={session} />;
}
