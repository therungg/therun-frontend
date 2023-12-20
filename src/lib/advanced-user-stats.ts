export const advancedUserStats = async (user: string, timezone: string) => {
    const res = await fetch(
        `https://dxg3hfz4b6ekynso45amgq2ife0tzhnl.lambda-url.eu-west-1.on.aws/${user}/${timezone}`,
    );
    const json = await res.json();

    return json.result;
};

export default advancedUserStats;
