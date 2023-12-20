export const includesCaseInsensitive = (
    haystack: string[],
    needle: string,
): boolean => {
    return haystack
        .map((entry) => entry.toLowerCase().trim())
        .includes(needle.toLowerCase().trim());
};
