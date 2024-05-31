import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { AreLocalesValid, Expect } from "types/i18n.types";

// Ensure that all imported locales match the structure of the first one
type Translations = [
    typeof import("../locales/en.json"),
    typeof import("../locales/fr.json"),
];
/**
 * This is some magic. Add the locale file import type to the Translations list and it'll spit out a type error if the interfaces don't match the `en` locale
 * TODO: Add specific locale in the message.
 */
// eslint-disable-next-line no-unused-vars
type ValidLocales = Expect<AreLocalesValid<Translations>>;

const SUPPORTED_LOCALES = ["en", "fr"];
const DEFAULT_LOCALE = "en";

const detectLocale = () => {
    // Initialize locale variable
    let locale = DEFAULT_LOCALE;

    // Try to get the locale from cookies
    const cookieStore = cookies();
    const localeCookie = cookieStore.get("NEXT_LOCALE");
    if (localeCookie) {
        locale = localeCookie.value;
    } else {
        // If no locale found in cookies, try to get from headers
        const acceptLanguageHeader = headers().get("accept-language");
        if (acceptLanguageHeader) {
            // Get the preferred language from the browser
            const preferredLocale = acceptLanguageHeader.split(",")[0];
            if (preferredLocale) {
                locale = preferredLocale.split("-")[0]; // Extract language part
            }
        }
    }

    // Ensure the locale is supported by your application
    if (!SUPPORTED_LOCALES.includes(locale)) {
        locale = DEFAULT_LOCALE; // Fallback to default locale
    }
    return locale;
};

export default getRequestConfig(async () => {
    const locale = detectLocale() || DEFAULT_LOCALE;
    return {
        locale,
        messages: (await import(`../locales/${locale}.json`)).default,
    };
});
