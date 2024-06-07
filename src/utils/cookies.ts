import { getCookie, setCookie } from "cookies-next";
import { RequestCookie } from "next/dist/compiled/@edge-runtime/cookies";
import { ValuesOf } from "types/utility.types";

export const COOKIE_KEY = {
    SCHEME: "scheme",
    SESSION_ID: "session_id",
    RACES_MESSAGE_READ: "races-message-read",
    PAGE_VISITS: "page_visits",
    RECENT_VISITS: "recent_visits",
} as const;

export const getCookieKey = async (
    key: ValuesOf<typeof COOKIE_KEY>,
    defaultValue?: string,
) => {
    // The `getCookie` function is not available on the server, imagine that
    // we have to access the scheme while Next.js is rendering the `<RootLayout />`
    // component (this happens server side). We can use the `cookies` function
    // from the `next/headers` package to access the cookies from the request headers.
    if (typeof window === "undefined") {
        const { cookies } = await import("next/headers");
        return cookies().has(key) ? cookies().get(key)?.value : defaultValue;
    }

    return getCookie(key, { path: "/" }) ?? defaultValue;
};

export const setCookieData = (
    key: ValuesOf<typeof COOKIE_KEY>,
    value: string,
) => {
    setCookie(key, value, { path: "/" });
};

export const parseCookie = (
    cookieData: RequestCookie | undefined,
    defaultValue?: unknown,
) => {
    if (cookieData) {
        try {
            return JSON.parse(cookieData.value);
        } catch (e) {
            return defaultValue;
        }
    }
    return defaultValue;
};
