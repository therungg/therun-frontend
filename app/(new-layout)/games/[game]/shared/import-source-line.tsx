import type { GameImportProvenance } from '~src/lib/game-mgmt';
import styles from './import-source-line.module.scss';

/**
 * Names the source of a board whose categories, variables and rules were
 * imported rather than written here.
 *
 * Two things ask for it and one line answers both: a runner reading the rules
 * to decide whether their run counts is owed the knowledge that those rules
 * are someone else's, and the leaderboard data we copied is licensed on the
 * condition that the source is credited with a link back.
 *
 * Renders nothing unless THIS board was imported — a game can hold imported
 * boards beside ones a moderator wrote here, and only the former may make the
 * claim.
 */
export function ImportSourceLine({
    provenance,
    categoryId,
    placement,
}: {
    provenance: GameImportProvenance | null;
    /** The board being looked at, not the game. */
    categoryId: number;
    /** 'footer' adds the rule and spacing that standing alone under the table needs. */
    placement: 'inline' | 'footer';
}) {
    if (!provenance) return null;

    // The game-wide settings sync applies to every board on the game, so it
    // stands in for boards the per-category mappings do not name — an older
    // import whose mapping rows predate `therun_id` being recorded.
    const imported =
        provenance.categoryIds.includes(categoryId) ||
        (provenance.categoryIds.length === 0 &&
            provenance.settingsSyncedAt !== null);
    if (!imported) return null;

    const { sourceUrl, sourceName } = provenance;
    const link = (text: string) =>
        sourceUrl ? (
            <a
                className={styles.link}
                href={sourceUrl}
                target="_blank"
                rel="noreferrer noopener"
                title={sourceName ?? undefined}
            >
                {text}
            </a>
        ) : null;

    return (
        <p
            className={`${styles.line} ${
                placement === 'footer' ? styles.footer : ''
            }`}
        >
            {provenance.settingsSyncedAt ? (
                <>
                    Rules and categories from speedrun.com.{' '}
                    {link('View on speedrun.com')}
                </>
            ) : (
                <>
                    Board setup from {link('speedrun.com') ?? 'speedrun.com'},
                    CC BY-NC 4.0
                </>
            )}
        </p>
    );
}
