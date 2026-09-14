import { countries } from '~src/common/countries';
import Link from '~src/components/link';
import { CountryFlag } from '~src/components/user/hover-card/country-flag';
import type { RunnerProfileHead } from '../../../../types/runner-profile.types';
import { RunnerAvatar } from '../../games-v2/[game]/leaderboard/runner-avatar';
import styles from './sections.module.scss';

function countryName(code: string | null): string | null {
    if (!code) return null;
    return (countries() as Record<string, string>)[code] ?? code.toUpperCase();
}

/** The compact identity line on every section page; the name leads back to the profile. */
export function SectionHeader({ head }: { head: RunnerProfileHead }) {
    const { runner } = head;
    const since = runner.runningSince
        ? new Date(runner.runningSince).getUTCFullYear()
        : null;
    const country = countryName(runner.country);
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
                <h1 className={styles.name}>
                    {runner.guest ? (
                        runner.name
                    ) : (
                        <Link href={`/${encodeURIComponent(runner.name)}`}>
                            {runner.name}
                        </Link>
                    )}
                </h1>
                <div className={styles.meta}>
                    {runner.pronouns ? <span>{runner.pronouns}</span> : null}
                    {runner.country ? (
                        <span>
                            <CountryFlag country={runner.country} /> {country}
                        </span>
                    ) : null}
                    {since ? <span>Running since {since}</span> : null}
                    {runner.guest ? <span>No account on therun</span> : null}
                </div>
            </div>
        </header>
    );
}
