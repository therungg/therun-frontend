export const isURIEncoded = (str: string) => /%/i.test(str);
export const safeEncodeURI = (str: string) =>
    isURIEncoded(str) ? str : encodeURIComponent(str);
