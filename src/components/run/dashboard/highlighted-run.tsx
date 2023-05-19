import { Run } from "../../../common/types";
import { StarFilledInIcon } from "../user-detail/user-overview";
import { Vod } from "./vod";
import { DurationToFormatted } from "../../util/datetime";

export const HighlightedRun = ({ run }: { run: Run }) => {
    return (
        <div>
            <h2>
                <StarFilledInIcon /> {run.game} - {run.run}
            </h2>
            <div style={{ fontSize: "larger", height: run.vod ? "300px" : "" }}>
                PB:{" "}
                <DurationToFormatted
                    duration={
                        run.hasGameTime
                            ? `${run.gameTimeData?.personalBest} (IGT)`
                            : run.personalBest
                    }
                />{" "}
                {run.hasGameTime && " (IGT)"}
                {run.vod && <Vod vod={run.vod} />}
            </div>
        </div>
    );
};
