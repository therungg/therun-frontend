export const includesCaseInsensitive = (
    haystack: string[],
    needle: string
): boolean => {
    return haystack
        .map((entry) => entry.toLowerCase().trim())
        .includes(needle.toLowerCase().trim());
};

export const arrayToMap = <T, K extends keyof T>(
    arr: T[],
    key: K
): Map<T[K], T> => {
    return new Map(arr.map((i) => [i[key], i]));
};
