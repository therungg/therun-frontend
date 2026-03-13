import styles from '~src/components/css/Tournament.module.scss';

export const TournamentInfoBox = () => {
    return (
        <div className={styles.infoBox}>
            <h2>Tournaments</h2>
            <hr />
            <div className="mb-3">
                Tournaments (also known as LTA&apos;s) allow many people to
                compete for the best time over a specific period of time. They
                usually take a day or a weekend. Here is how The Run helps
                making organizing tournaments much easier:
            </div>
            <ul>
                <li>Automatically generates multiple leaderboards</li>
                <li>Shows live status of all participants</li>
                <li>Run overview of all runs in the tournament</li>
                <li>Record history graph for the tournament</li>
            </ul>
        </div>
    );
};
