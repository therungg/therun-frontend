export const equalsCaseInsensitive = (a?: string, b?: string): boolean => {
    if (a === undefined || b === undefined) return false;

    return a.toLowerCase().trim() === b.toLowerCase().trim();
};

export const includesCaseInsensitive = (
    needle: string,
    haystack: string
): boolean => {
    return haystack.toLowerCase().trim().includes(needle.toLowerCase().trim());
};
