// Used for the global `useTranslations` hook typing
type Messages = typeof import("../locales/en.json");

declare global {
    // Use type safe message keys with `next-intl`
    // We're in a declaration file this lint rule is so silly here lol
    // eslint-disable-next-line no-unused-vars
    interface IntlMessages extends Messages {}
}
