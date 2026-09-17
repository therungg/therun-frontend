import type React from 'react';
import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import { parseSubcategoryKey } from '~src/lib/run-view/parse-subcategory-key';
import { normalizeVariableName } from '~src/lib/variables/keys';
import { formatSubcategoryKey } from '../labels';
import { CountryFlag } from '../leaderboard/country-flag';
import { RunnerAvatar } from '../leaderboard/runner-avatar';
import { RunActions } from './run-actions';
import { AutoVerifiedBadge, VerificationBadge } from './run-badges';
import { formatDelta } from './run-format';
import styles from './run-page.module.scss';
import type { RunViewModel } from './run-view';

export function RunHero({
    model,
    gameHref,
    boardHref,
    isTombstone,
    sessionUsername,
    meta,
}: {
    model: RunViewModel;
    gameHref: string;
    boardHref: string;
    isTombstone: boolean;
    sessionUsername: string | null;
    /** Date / clocks / video line, rendered under the runner. */
    meta?: React.ReactNode;
}) {
    const primaryTime = model.realTime ?? model.gameTime;
    const subcategoryLabel = formatSubcategoryKey(model.subcategoryKey);
    const ctx = model.boardContext;
    const isRecord = ctx?.rank === 1;
    // The time the board ranks this run by — same pick as the board slice.
    const rankedTime =
        ctx && model.realTime != null && ctx.view.timing === 'rt'
            ? model.realTime
            : (model.gameTime ?? model.realTime);
    const second = isRecord ? ctx?.below[0] : undefined;
    const lead = second && rankedTime != null ? second.time - rankedTime : null;
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
    const podiumClass =
        ctx?.rank === 2
            ? styles.rankSilver
            : ctx?.rank === 3
              ? styles.rankBronze
              : '';

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

            {ctx && isRecord && (
                <div className={styles.record}>
                    <Link href={boardHref} className={styles.recordChip}>
                        World record
                    </Link>
                    {lead != null && lead > 0 && (
                        <span className={styles.recordLead}>
                            <strong>{formatDelta(lead)}</strong> ahead of #
                            {second?.rank}
                        </span>
                    )}
                </div>
            )}

            <div className={styles.timeRow}>
                <h1
                    className={`${styles.time} ${isRecord ? styles.timeGold : ''}`}
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
                {ctx && !isRecord && (
                    <Link href={boardHref} className={styles.rank}>
                        <strong className={podiumClass}>#{ctx.rank}</strong> of{' '}
                        {ctx.totalRunners.toLocaleString()}
                    </Link>
                )}
                {isTombstone && (
                    <span className={styles.notRanked}>Not ranked</span>
                )}
                <span className={styles.badges}>
                    <VerificationBadge status={model.verificationStatus} />
                    <AutoVerifiedBadge verifiedVia={model.verifiedVia} />
                </span>
            </div>

            <div className={styles.runner}>
                <RunnerAvatar
                    name={model.runnerName}
                    picture={model.picture}
                    size="md"
                />
                <span className={styles.runnerName}>
                    {model.isGuest || model.userId == null ? (
                        model.runnerName
                    ) : (
                        <UserLink
                            username={model.runnerName}
                            to="leaderboards"
                        />
                    )}
                </span>
                <CountryFlag country={model.country} />
                <div className={styles.heroActions}>
                    <RunActions
                        model={model}
                        sessionUsername={sessionUsername}
                    />
                </div>
            </div>
            {meta}
        </header>
    );
}
