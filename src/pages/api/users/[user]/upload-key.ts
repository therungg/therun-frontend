import getUploadKey from "../../../../lib/get-upload-key";

export const handler = async (req: any, res: any) => {
    const user = req.url.replace("/api/users/", "").replace("/upload-key", "");

    const userData = await getUploadKey(user);

    res.status(200)
        .setHeader("Access-Control-Allow-Origin", "*")
        .json(userData);
};

export default handler;
