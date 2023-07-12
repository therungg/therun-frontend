export const getTournaments = async () => {
    const url = `${process.env.NEXT_PUBLIC_DATA_URL}/tournaments/`;

    const res = await fetch(url);
    const json = await res.json();

    return json.result;
};

export const getTournamentByName = async (name: string) => {
    const url = `${process.env.NEXT_PUBLIC_DATA_URL}/tournaments/${name}`;

    const res = await fetch(url);
    const json = await res.json();

    return json.result;
};

export const getTournamentStatsByName = async (name: string) => {
    const url = `${process.env.NEXT_PUBLIC_DATA_URL}/tournaments/${name}/stats`;

    const res = await fetch(url);
    const json = await res.json();

    return json.result;
};

export const banUserFromTournament = async (
    name: string,
    userString: string
) => {
    const url = `${process.env.NEXT_PUBLIC_DATA_URL}/tournaments/${name}/removeUser/${userString}`;

    const res = await fetch(url);
    const json = await res.json();

    return json.result;
};
