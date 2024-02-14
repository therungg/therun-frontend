import { Race } from "~app/races/races.types";
import { User } from "../../../types/session.types";
import { isRaceModerator } from "~src/rbac/confirm-permission";
import { AbortRaceButton } from "~app/races/components/buttons/abort-race-button";
import { Button } from "react-bootstrap";

export const RaceAdminActions = ({
    race,
    user,
}: {
    race: Race;
    user?: User;
}) => {
    if (!user || !isRaceModerator(race, user)) {
        return <></>;
    }
    const raceIsPending = race.status === "pending";

    if (!raceIsPending) {
        return <></>;
    }

    return (
        <div
            className={
                "rounded-3 px-4 pt-2 pb-4 mb-3 game-border bg-body-secondary"
            }
            style={{
                borderColor: "var(--bs-link-color)",
            }}
        >
            <span className={"h4 w-100 flex-center"}>Moderator actions</span>
            <hr />
            <a href={`/races/${race.raceId}/edit`}>
                <Button variant={"primary"} className={"w-100 fs-5"}>
                    Edit race
                </Button>
            </a>
            {raceIsPending && (
                <AbortRaceButton
                    raceId={race.raceId}
                    variant={"danger"}
                    className={"w-100 fs-5 mt-2"}
                />
            )}
        </div>
    );
};
