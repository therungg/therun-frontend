export const getGlobalUser = async (user: string) => {
    const url = `${process.env.NEXT_PUBLIC_DATA_URL}/users/global/${user}`;

    const res = await fetch(url);
    const json = await res.json();

    return json.result;
};

export default getGlobalUser;
