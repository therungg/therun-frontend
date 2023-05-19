export const fetcher = async (...args: Parameters<typeof fetch>) => {
    const result = await fetch(...args);
    return result.json();
};
