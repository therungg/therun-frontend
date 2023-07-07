export const equalsCaseInsensitive = (a?: string, b?: string): boolean => {
    if (a === undefined || b === undefined) return false;

    return a.toLowerCase().trim() === b.toLowerCase().trim();
};
