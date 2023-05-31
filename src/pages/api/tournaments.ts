import { getTournaments } from "../../components/tournament/getTournaments";
import { NextResponse } from "next/server";

export const handler = async (req, res) => {
    if (req.method !== "GET") {
        return NextResponse.json(
            {
                error: "Must be GET request and supply `q` parameter",
            },
            { status: 400 }
        );
    }

    const result = await getTournaments();

    res.setHeader(
        "Cache-Control",
        "s-maxage=300, stale-while-revalidate=12000"
    );

    res.status(200).json(result);
};

export default handler;
