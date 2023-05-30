import { findUserOrRun } from "../../components/search/find-user-or-run";
import { NextResponse } from "next/server";

export const handler = async (req, res) => {
    if (req.method !== "GET" || !req.query.q) {
        return NextResponse.json(
            {
                error: "Must be GET request and supply `q` parameter",
            },
            { status: 400 }
        );
    }

    const result = await findUserOrRun(req.query.q);

    for (const category in result.categories) {
        result.categories[category] = result.categories[category].filter(
            (cat) => {
                return (
                    cat.run.split("//").filter((r) => !!r).length === 3 &&
                    (!!cat.pb || !!cat.pbgt)
                );
            }
        );

        if (result.categories[category].length === 0) {
            delete result.categories[category];
            continue;
        }

        result.categories[category].sort((a, b) => {
            if (a.pbgt || b.pbgt) {
                if (!a.pbgt) return 1;
                if (!b.pbgt) return -1;
                return parseInt(a.pbgt) - parseInt(b.pbgt);
            }
            if (!a.pb) return 1;
            if (!b.pb) return -1;
            return parseInt(a.pb) - parseInt(b.pb);
        });
    }

    res.status(200).json(result);
};

export default handler;
