import { safeEncodeURI } from "~src/utils/uri";
import { History } from "../common/types";

export const getSplitsHistory = async (
    filename: string,
    hasGameTime = false,
): Promise<History> => {
    const res = await fetch(getSplitsHistoryUrl(filename, hasGameTime), {
        mode: "cors",
    });

    return res.json();
};

export const getSplitsHistoryUrl = (
    filename: string,
    hasGameTime = false,
): string => {
    filename = filename
        .split("/")
        .map((name, key) => {
            if (key > 2) return name;
            return safeEncodeURI(name);
        })
        .join("/");

    if (hasGameTime) {
        filename = filename.replace("history.json", "history-gametime.json");
    }

    return `https://d1qsrp2avfthuv.cloudfront.net/${filename}`;
};
