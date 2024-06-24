// Used for the global `useTranslations` hook typing
type Messages = typeof import("../locales/en.json");

declare global {
    // Use type safe message keys with `next-intl`
    // We're in a declaration file this lint rule is so silly here lol
    interface IntlMessages extends Messages {}
}
