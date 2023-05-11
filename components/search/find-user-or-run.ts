export const findUserOrRun = async (term: string) => {
    if (term.length < 2) return [];

    const url = `${process.env.NEXT_PUBLIC_SEARCH_URL}?q=${term}`;

    const res = await fetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    const json = await res.json();

    return json.result;
};
