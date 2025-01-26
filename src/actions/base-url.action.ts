"use server";
import { headers } from "next/headers";

export const getBaseUrl = async () => {
    if (process.env.NEXT_PUBLIC_BASE_URL)
        return process.env.NEXT_PUBLIC_BASE_URL;
    if (process.env.NEXT_PUBLIC_VERCEL_URL)
        return process.env.NEXT_PUBLIC_VERCEL_URL;

    const headersList = await headers();
    return headersList.get("origin") || "";
};
