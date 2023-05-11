import { getUserRuns } from "../../../lib/get-user-runs";
import { editUser } from "../../../lib/edit-user";

export const handler = async (req: any, res: any) => {
    const user = req.url.replace("/api/users/", "");

    let userData;

    if (req.method === "PUT") {
        userData = await editUser(user, req.body);
        res.setHeader("Cache-Control", "no-cache");
    } else {
        userData = await getUserRuns(user);
        res.setHeader(
            "Cache-Control",
            "s-maxage=60, stale-while-revalidate=1500"
        );
    }

    res.status(200)
        .setHeader("Access-Control-Allow-Origin", "*")
        .json(userData);
};

export default handler;
