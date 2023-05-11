import savePatreonSettings from "../../../../lib/save-patreon-settings";

export const handler = async (req: any, res: any) => {
    const user = req.url
        .replace("/api/users/", "")
        .replace("/patreon-settings", "");

    const userData = await savePatreonSettings(user, req.body);

    res.status(200)
        .setHeader("Access-Control-Allow-Origin", "*")
        .json(userData);
};

export default handler;
