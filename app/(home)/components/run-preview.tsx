import { Run } from "~src/common/types";
import { DurationToFormatted, FromNow } from "~src/components/util/datetime";
import { UserGameCategoryLink, UserLink } from "~src/components/links/links";

export const RunPreview = ({ run }: { run: Run }) => {
    const duration = run.hasGameTime
        ? (run.gameTimeData?.personalBest as string)
        : run.personalBest;

    const gameTimeLabel = run.hasGameTime ? " (IGT)" : "";

    return (
        <tr>
            <td className="p-2">
                <div className="fs-larger">
                    <UserGameCategoryLink
                        url={run.url}
                        username={run.user}
                        game={run.game}
                        category={run.run}
                    />{" "}
                    in <DurationToFormatted duration={duration} />
                    {gameTimeLabel}
                </div>

                <div className="fs-smaller">
                    <FromNow time={run.personalBestTime} /> by{" "}
                    <UserLink username={run.user} />
                    <br />
                </div>
            </td>
        </tr>
    );
};
