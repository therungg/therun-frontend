function isEncoded(uri: string): boolean {
    try {
        // We try to decode the URI. If it's encoded, this should always succeed
        const decoded = decodeURIComponent(uri);

        // If the decode operation succeeded, we need to make sure it wasn't a false positive.
        // We encode the string again. If it matches the original, then it was truly encoded
        // If not, the original string was not encoded
        return uri === encodeURIComponent(decoded);
    } catch (e) {
        // If the decode operation fails, this means the URI was not correctly encoded
        return false;
    }
}

export const safeEncodeURI = (str: string) =>
    isEncoded(str) ? str : encodeURIComponent(str);

export const safeDecodeURI = (str: string) => {
    return decodeURIComponent(safeEncodeURI(str));
};
