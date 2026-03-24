import { Race, TeamResult } from '~app/(new-layout)/races/races.types';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import styles from '../race-detail.module.scss';

interface TeamResultsProps {
    race: Race;
}

export const TeamResults = ({ race }: TeamResultsProps) => {
    const teamResults = race.teamResults;
    if (!teamResults || teamResults.length === 0) return null;

    const methodLabel = race.teamResultMethod === 'sum' ? 'sum' : 'avg';

    return (
        <div className={styles.standingsPanel}>
            <span className={styles.panelTitle}>Team Rankings</span>
            <hr className={styles.panelDivider} />
            <table className={styles.standingsTable}>
                <thead>
                    <tr>
                        <th className={styles.placingCell}>#</th>
                        <th style={{ textAlign: 'left' }}>Team</th>
                        <th>Time ({methodLabel})</th>
                    </tr>
                </thead>
                <tbody>
                    {teamResults.map((result) => (
                        <TeamResultRow key={result.name} result={result} />
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const TeamResultRow = ({ result }: { result: TeamResult }) => {
    return (
        <tr>
            <td className={styles.placingCell}>
                {result.position !== null ? `${result.position}.` : '\u2014'}
            </td>
            <td style={{ textAlign: 'left' }}>
                <span
                    style={{
                        display: 'inline-block',
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: result.color,
                        marginRight: '0.4rem',
                    }}
                />
                <span className={result.disqualified ? 'text-secondary' : ''}>
                    {result.name}
                    {result.disqualified && ' (DQ)'}
                </span>
                <div
                    style={{
                        fontSize: '0.75rem',
                        color: 'var(--bs-secondary-color)',
                        marginLeft: '1.4rem',
                    }}
                >
                    {result.members.map((m, i) => (
                        <span key={m.user}>
                            {i > 0 && ', '}
                            <UserLink
                                username={m.user}
                                url={`/${m.user}/races`}
                                icon={false}
                            />{' '}
                            {m.finalTime !== null ? (
                                <DurationToFormatted duration={m.finalTime} />
                            ) : (
                                'DNF'
                            )}
                        </span>
                    ))}
                </div>
            </td>
            <td className={styles.timeCell}>
                {result.time !== null ? (
                    <DurationToFormatted duration={result.time} />
                ) : (
                    '\u2014'
                )}
            </td>
        </tr>
    );
};
