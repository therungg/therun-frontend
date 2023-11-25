import { Run } from "~src/common/types";
import { DurationToFormatted, FromNow } from "~src/components/util/datetime";
import {
    display,
    UserGameCategoryLink,
    UserLink,
} from "~src/components/links/links";

export const RunPreview = ({ run }: { run: Run }) => {
    const duration = run.hasGameTime
        ? (run.gameTimeData?.personalBest as string)
        : run.personalBest;

    const gameTimeLabel = run.hasGameTime ? " (IGT)" : "";

    return (
        <UserGameCategoryLink
            url={run.url}
            username={run.user}
            game={run.game}
            category={run.run}
            className={"tw-group"}
        >
            <div
                className={
                    "tw-rounded tw-flex tw-flex-col md:tw-flex-row md:tw-gap-1 tw-border-l-4 tw-pl-4 tw-py-2 tw-border-l-therun-green odd:tw-bg-gray-50"
                }
            >
                <div
                    className={
                        "tw-border-b-2 tw-border-b-transparent group-hover:tw-border-b-therun-green"
                    }
                >
                    <span className={"tw-font-semibold"}>
                        {display(run.game)} - {display(run.run)} in{" "}
                    </span>
                    <DurationToFormatted duration={duration} />
                    {gameTimeLabel}
                </div>

                <div className={"tw-text-sm md:tw-text-base"}>
                    <FromNow time={run.personalBestTime} /> by{" "}
                    <span className={"tw-font-semibold"}>
                        <UserLink username={run.user} />
                    </span>
                </div>
            </div>
        </UserGameCategoryLink>
    );
};
