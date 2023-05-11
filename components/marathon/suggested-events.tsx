import { LiveRun } from "../live/live-user-run";
import { SendMarathonDataButton } from "./send-marathon-data-button";

export const SuggestedEvents = ({
    liveRun,
    sessionId,
}: {
    liveRun: LiveRun;
    sessionId: string;
}) => {
    return (
        <div>
            <h2>Events for current split</h2>

            {liveRun.events.map((event) => {
                return (
                    <div key={event.time + event.name}>
                        <SendMarathonDataButton
                            description={event.description}
                            sessionId={sessionId}
                            data={event}
                            buttonText={`Submit ${event.name}`}
                        />
                        <hr />
                    </div>
                );
            })}
        </div>
    );
};

export default SuggestedEvents;
