export const isURIEncoded = (str: string) => /%/i.test(str);
export const encodeURI = (str: string) =>
    isURIEncoded(str) ? str : encodeURIComponent(str);
