import { Split } from "~src/common/types";

export type Status = "future" | "current" | "skipped" | "completed";

export interface SplitStatus {
    time: number | undefined;
    singleTime: number | null | undefined;
    status: Status;
    name: string;
    isSubSplit: boolean;
    isActive: boolean;
    isGold: boolean;
    possibleTimeSave: number | null;
    comparisons: {
        [key: string]: Split;
    };
}
