"use client";

import { motion } from "framer-motion";
import LiveRunCard from "./live-run-card";
import { LiveRun } from "~app/live/live.types";

export default function LiveRuns({ runs }: { runs: LiveRun[] }) {
    const getDeltaColor = (deltaTime) => {
        return deltaTime.startsWith("-") ? "text-success" : "text-danger";
    };

    return (
        <div className="overflow-hidden">
            <motion.div
                drag="x"
                dragConstraints={{ left: -1200, right: 0 }}
                className="d-flex gap-4 h-100"
                style={{ cursor: "grab" }}
                whileTap={{ cursor: "grabbing" }}
            >
                {runs.map((run, i) => (
                    <LiveRunCard
                        key={i}
                        run={run}
                        getDeltaColor={getDeltaColor}
                    />
                ))}
            </motion.div>
        </div>
    );
}
