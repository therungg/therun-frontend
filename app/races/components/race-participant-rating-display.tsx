import { RaceParticipant } from "~app/races/races.types";

export const RaceParticipantRatingDisplay = ({
    raceParticipant,
}: {
    raceParticipant: RaceParticipant;
}) => {
    if (!raceParticipant.ratingBefore) return <></>;

    const rating = raceParticipant.ratingAfter || raceParticipant.ratingBefore;
    return (
        <span className="font-monospace">
            {rating}
            <RatingAfter raceParticipant={raceParticipant} />
        </span>
    );
};

const RatingAfter = ({
    raceParticipant,
}: {
    raceParticipant: RaceParticipant;
}) => {
    if (!raceParticipant.ratingAfter) return <></>;

    const difference =
        raceParticipant.ratingAfter - raceParticipant.ratingBefore;

    return (
        <sup
            className="fst-italic"
            style={{
                color:
                    difference === 0
                        ? ""
                        : difference > 0
                          ? "var(--bs-link-color)"
                          : "red",
                marginLeft: "0.3rem",
            }}
        >
            {difference >= 0 && "+"}
            {difference}
        </sup>
    );
};
