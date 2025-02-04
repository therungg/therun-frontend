import React from "react";
import { Homepage } from "~app/home/homepage";
import { getAllEvents } from "~src/lib/events";

export const revalidate = 60;

export default async function Page() {
    const events = await getAllEvents();

    console.log(events);

    return <Homepage />;
}
