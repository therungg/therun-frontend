import Link from '~src/components/link';
import { CountryFlag } from '~src/components/user/hover-card/country-flag';
import type { LeaderboardsProfileRunner } from '../../../../types/leaderboards-profile.types';
import { RunnerAvatar } from '../../games-v2/[game]/leaderboard/runner-avatar';
import styles from './leaderboards-profile.module.scss';

const dateFmt = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
});

const socialHref = (v: string) => (/^https?:\/\//i.test(v) ? v : null);

export function ProfileHeader({
    runner,
}: {
    runner: LeaderboardsProfileRunner;
}) {
    const guest = runner.userId === null;
    return (
        <header className={styles.header}>
            <div className={styles.avatar}>
                <RunnerAvatar
                    name={runner.name}
                    picture={runner.picture}
                    size="md"
                />
            </div>
            <div className={styles.identity}>
                <div className={styles.name}>
                    {runner.name}
                    <CountryFlag country={runner.country} />
                </div>
                <div className={styles.meta}>
                    {runner.pronouns ? <span>{runner.pronouns}</span> : null}
                    {runner.joinedAt ? (
                        <span>
                            Joined {dateFmt.format(new Date(runner.joinedAt))}
                        </span>
                    ) : null}
                    {runner.firstBoardRunAt ? (
                        <span>
                            First board run{' '}
                            {dateFmt.format(new Date(runner.firstBoardRunAt))}
                        </span>
                    ) : null}
                    {runner.patron ? <span>Supporter</span> : null}
                </div>
                {runner.bio ? <p className={styles.bio}>{runner.bio}</p> : null}
                {runner.moderates.length > 0 ? (
                    <div className={styles.meta}>
                        <span>
                            Moderates{' '}
                            {runner.moderates.map((m, i) => (
                                <span key={m.gameId}>
                                    {i > 0 ? ', ' : ''}
                                    <Link
                                        href={`/games-v2/${encodeURIComponent(m.gameSlug)}`}
                                    >
                                        {m.game}
                                    </Link>
                                </span>
                            ))}
                        </span>
                    </div>
                ) : null}
                {runner.deleted ? (
                    <p className={styles.stateNote}>
                        This account was deleted.
                    </p>
                ) : guest ? (
                    <p className={styles.stateNote}>No account on therun.</p>
                ) : null}
                {runner.importLinked ? (
                    <p className={styles.stateNote}>
                        Imported runs are linked to this account.
                    </p>
                ) : null}
                <div className={styles.links}>
                    {!guest && !runner.deleted ? (
                        <Link href={`/${encodeURIComponent(runner.name)}`}>
                            Stats profile →
                        </Link>
                    ) : null}
                    {Object.entries(runner.socials).map(([key, value]) => {
                        const href = socialHref(value);
                        return href ? (
                            <a
                                key={key}
                                href={href}
                                rel="noopener noreferrer"
                                target="_blank"
                            >
                                {key}
                            </a>
                        ) : null;
                    })}
                </div>
            </div>
        </header>
    );
}
