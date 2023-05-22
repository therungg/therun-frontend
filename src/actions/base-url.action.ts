"use server";
import { headers } from "next/headers";

export const getBaseUrl = () => {
    if (process.env.NEXT_PUBLIC_BASE_URL)
        return process.env.NEXT_PUBLIC_BASE_URL;
    if (process.env.NEXT_PUBLIC_VERCEL_URL)
        return process.env.NEXT_PUBLIC_VERCEL_URL;

    const headersList = headers();
    return headersList.get("origin") || "";
};
