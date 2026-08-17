import { BoxArrowUpRight } from 'react-bootstrap-icons';
import { UserLink } from '~src/components/links/links';
import type { GameModerator } from '../../../../../types/board-claims.types';
import { ClaimCta, type ClaimCtaState } from '../claim/claim-cta';
import styles from './sidebar.module.scss';

const MAX_MODS_SHOWN = 4;

export interface TrustFacts {
    platforms: string[];
    releaseYear: number | null;
    developer: string | null;
    igdbUrl: string | null;
    /** Mod-written description. IGDB's marketing blurb is not shown here. */
    description: string | null;
}

interface Props {
    gameDisplay: string;
    facts: TrustFacts;
    moderators: GameModerator[];
    claim?: ClaimCtaState | null;
}

/**
 * The rail's foot: what this game is and who vouches for the board. Unboxed
 * on purpose. It's reference, not activity, and sits a step quieter than the
 * panels above it. Renders nothing when there's nothing to say.
 */
export function TrustFoot({ gameDisplay, facts, moderators, claim }: Props) {
    const factLine = [
        facts.platforms.join(', ') || null,
        facts.releaseYear ? String(facts.releaseYear) : null,
        facts.developer,
    ].filter((s): s is string => Boolean(s));

    const shownMods = moderators.slice(0, MAX_MODS_SHOWN);
    const moreMods = moderators.length - shownMods.length;
    const description = facts.description?.trim() || null;
    const showClaim = Boolean(claim?.hasModerators);

    if (
        factLine.length === 0 &&
        moderators.length === 0 &&
        !description &&
        !facts.igdbUrl &&
        !showClaim
    ) {
        return null;
    }

    return (
        <footer className={styles.trustFoot} aria-label="About this board">
            {description && (
                <p className={styles.trustDescription}>{description}</p>
            )}
            {factLine.length > 0 && (
                <p className={styles.trustLine}>{factLine.join(' · ')}</p>
            )}
            {moderators.length > 0 && (
                <p className={styles.trustLine}>
                    <span className={styles.trustLabel}>Moderated by </span>
                    {shownMods.map((m, i) => (
                        <span key={m.assignmentId}>
                            {i > 0 && ', '}
                            <UserLink username={m.username} url={undefined} />
                        </span>
                    ))}
                    {moreMods > 0 && ` +${moreMods}`}
                </p>
            )}
            {(facts.igdbUrl || showClaim) && (
                <p className={`${styles.trustLine} ${styles.trustLinks}`}>
                    {facts.igdbUrl && (
                        <a
                            href={facts.igdbUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.quietLink}
                        >
                            IGDB <BoxArrowUpRight size={10} aria-hidden />
                        </a>
                    )}
                    {showClaim && claim && (
                        <ClaimCta
                            claim={claim}
                            gameDisplay={gameDisplay}
                            triggerClassName={styles.quietLink}
                        />
                    )}
                </p>
            )}
        </footer>
    );
}
