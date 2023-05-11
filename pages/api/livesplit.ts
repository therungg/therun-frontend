export const handler = async (req, res) => {
    const setCurrentRunApi = process.env.NEXT_PUBLIC_SET_LIVE_RUN_API_URL;

    const response = await fetch(setCurrentRunApi, {
        method: "post",
        body: req.body,
    });

    if (response.status < 300) {
        return res.status(200).json({ response: "ok" });
    }

    return res
        .status(response.status)
        .json({ response: await response.json() });
};

export default handler;
