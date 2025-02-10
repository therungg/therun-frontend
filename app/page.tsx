import React from "react";
import { Homepage } from "~app/home/homepage";

export const revalidate = 60;

export default async function Page() {
    return <Homepage />;
}
