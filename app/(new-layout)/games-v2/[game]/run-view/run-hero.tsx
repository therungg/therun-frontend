import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import { parseSubcategoryKey } from '~src/lib/run-view/parse-subcategory-key';
import { normalizeVariableName } from '~src/lib/variables/keys';
import { formatSubcategoryKey } from '../labels';
import { CountryFlag } from '../leaderboard/country-flag';
import { RunnerAvatar } from '../leaderboard/runner-avatar';
import { AutoVerifiedBadge, VerificationBadge } from './run-badges';
import styles from './run-page.module.scss';
import type { RunViewModel } from './run-view';

export function RunHero({
    model,
    gameHref,
    boardHref,
    isTombstone,
}: {
    model: RunViewModel;
    gameHref: string;
    boardHref: string;
    isTombstone: boolean;
}) {
    const primaryTime = model.realTime ?? model.gameTime;
    const subcategoryLabel = formatSubcategoryKey(model.subcategoryKey);
    const ctx = model.boardContext;
    // Subcategory variables are already in the crumb label; pill the rest.
    // Both the key's names and `variables`' keys are `nameNormalized`.
    const subcategoryNames = new Set(
        parseSubcategoryKey(model.subcategoryKey).map((p) =>
            normalizeVariableName(p.name),
        ),
    );
    const variablePills = Object.entries(model.variables).filter(
        ([name]) => !subcategoryNames.has(normalizeVariableName(name)),
    );

    return (
        <header className={styles.hero}>
            <nav aria-label="Breadcrumb" className={styles.crumb}>
                <Link href={gameHref} className={styles.crumbGame}>
                    {model.game.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={model.game.image}
                            width={36}
                            height={48}
                            alt=""
                        />
                    )}
                    <span>{model.game.display}</span>
                </Link>
                <span className={styles.crumbSep}>·</span>
                <Link href={boardHref}>{model.categoryDisplay}</Link>
                {subcategoryLabel && (
                    <>
                        <span className={styles.crumbSep}>·</span>
                        <Link href={boardHref}>{subcategoryLabel}</Link>
                    </>
                )}
                {variablePills.map(([name, value]) => (
                    <span key={name} className={styles.varPill}>
                        {value}
                    </span>
                ))}
            </nav>

            <div className={styles.timeRow}>
                <h1
                    className={`${styles.time} ${ctx?.rank === 1 ? styles.timeGold : ''}`}
                >
                    {primaryTime != null ? (
                        <DurationToFormatted
                            duration={primaryTime}
                            withMillis
                        />
                    ) : (
                        '—'
                    )}
                </h1>
                <VerificationBadge status={model.verificationStatus} />
                <AutoVerifiedBadge verifiedVia={model.verifiedVia} />
                {isTombstone && (
                    <span className={styles.notRanked}>Not ranked</span>
                )}
                {ctx && (
                    <Link href={boardHref} className={styles.rank}>
                        <strong>#{ctx.rank}</strong> of {ctx.totalRunners}
                    </Link>
                )}
            </div>

            <div className={styles.runner}>
                <CountryFlag country={model.country} />
                <RunnerAvatar name={model.runnerName} size="md" />
                {model.isGuest || model.userId == null ? (
                    <span>{model.runnerName}</span>
                ) : (
                    <UserLink username={model.runnerName} to="leaderboards" />
                )}
            </div>
        </header>
    );
}
