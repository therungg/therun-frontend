import { motion } from "framer-motion";
import { Clock } from "react-bootstrap-icons";
import { LiveRun } from "~app/live/live.types";

export default function LiveRunCard({ run }: { run: LiveRun }) {
    return (
        <motion.div
            className="position-relative min-w-320 bg-dark bg-opacity-50 rounded overflow-hidden border border-light border-opacity-10"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
        >
            <img
                src=""
                alt={run.game}
                className="w-100 object-fit-cover"
                style={{ height: "144px" }}
            />

            <div className="p-3">
                <div className="d-flex flex-column h-100 justify-content-between">
                    <div>
                        <h3 className="text-light opacity-90 fw-semibold">
                            {run.game}
                        </h3>
                        <p className="text-light opacity-60 small">
                            {run.category}
                        </p>
                    </div>

                    <div className="d-flex flex-column gap-2">
                        <div className="d-flex justify-content-between align-items-center">
                            <span className="text-light opacity-70 small">
                                {run.user}
                            </span>
                            <div className="d-flex align-items-center gap-2">
                                <Clock
                                    size={16}
                                    className="text-light opacity-60"
                                />
                                <span className="small text-light opacity-90">
                                    {run.startedAt}
                                </span>
                            </div>
                        </div>
                        <div className="d-flex justify-content-end">
                            <span className="small fw-medium">
                                {run.delta}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            <div
                className="w-100"
                style={{
                    height: "8px",
                    backgroundColor: "rgba(255,255,255,0.1)",
                }}
            ></div>
        </motion.div>
    );
}
