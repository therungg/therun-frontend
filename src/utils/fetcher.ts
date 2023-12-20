export const fetcher = async (...args: Parameters<typeof fetch>) => {
    const result = await fetch(...args);
    return result.json();
};

export const multiFetcher = async (urls: string[]) => {
    const results = await Promise.allSettled(
        urls.map((url) => {
            return fetcher(url);
        }),
    );

    return results.map((result) => {
        if (result.status !== "fulfilled") return null;

        return result.value;
    });
};
