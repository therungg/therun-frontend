"use client";

import { RunPreview } from "~src/components/frontpage/run-preview";
import React from "react";
import type { Run } from "~src/common/types";

export const DataHolder = ({ runs }: { runs: Run[] }) => {
    return (
        <div
            className={
                "tw-flex tw-flex-grow tw-flex-col tw-gap-3 tw-justify-between"
            }
        >
            {runs
                .filter(
                    (run) =>
                        run.personalBestTime != undefined &&
                        run.personalBestTime != "0"
                )
                .map((run: Run) => {
                    return (
                        <RunPreview
                            key={`${run.user} ${run.game} ${run.run}`}
                            run={run}
                        />
                    );
                })}
        </div>
    );
};
