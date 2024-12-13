import { WrappedWithData } from "~app/[username]/wrapped/wrapped-types";
import { WrappedTitle } from "~app/[username]/wrapped/wrapped-title";

interface RenderFinishedWrappedProps {
    user: string;
    wrapped: WrappedWithData;
}

// Todo:: actually render this shit
export const RenderFinishedWrapped = ({
    wrapped,
    user,
}: RenderFinishedWrappedProps) => {
    if (!wrapped.hasEnoughRuns) {
        return (
            <div>
                Unfortunately, there is not enough data on your account to
                generate a Wrapped. If you think this is incorrect, please
                contact us on Discord.
            </div>
        );
    }

    return (
        <div>
            <WrappedTitle user={user} />
            <RenderTotalStatsCompliment wrapped={wrapped} />
        </div>
    );
};

const RenderTotalStatsCompliment = ({
    wrapped,
}: {
    wrapped: WrappedWithData;
}) => {
    return (
        <div>
            <p className="flex-center display-4">You had a great 2024.</p>
            <p className="flex-center h4">
                <div>
                    This year, you started a total of <b>{wrapped.totalRuns}</b>{" "}
                    runs! You finished <b>{wrapped.totalFinishedRuns}</b> of
                    them.
                </div>
            </p>
            <p className="flex-center h4">
                <div>
                    That gives you a reset percentage of{" "}
                    <b>
                        {(
                            (wrapped.totalFinishedRuns / wrapped.totalRuns) *
                            100
                        ).toFixed(2)}
                        %
                    </b>
                    .
                </div>
            </p>
        </div>
    );
};
