export const TournamentInfoBox = () => {
    return (
        <div
            className={"game-border bg-body-secondary rounded-2 px-4 py-3 mb-3"}
        >
            <h2>Tournaments</h2>
            <hr />
            <div className={"mb-3"}>
                Tournaments (also known as LTA&apos;s) allow many people to
                compete for the best time over a specific period of time. They
                usually take a day or a weekend. Here is how The Run helps
                making organizing tournaments much easier:
            </div>
            <ul className={"mb-1"}>
                <li>Automatically generates multiple leaderboards</li>
                <li>Shows live status of all participants</li>
                <li>Run overview of all runs in the tournament</li>
                <li>Record history graph for the tournament</li>
            </ul>
        </div>
    );
};
