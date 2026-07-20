import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { TwitchLoginButton } from '~src/components/twitch/TwitchLoginButton';
import { buildBoardHref } from '~src/lib/board-url';
import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import buildMetadata, { getGameImage } from '~src/utils/metadata';
import { safeDecodeURI } from '~src/utils/uri';
import { BackLink } from '../shared/back-link';
import { buildSubcategoryKey } from './subcategory-key';
import { SubmitForm } from './submit-form';
import styles from './submit-page.module.scss';

interface PageProps {
    params: Promise<{ game: string }>;
    searchParams: Promise<{
        mode?: string;
        category?: string;
        [key: string]: string | undefined;
    }>;
}

/** mode/category are handled separately; everything else is a candidate subcategory param. */
function extractInitialSubcategoryValues(
    sp: Awaited<PageProps['searchParams']>,
): Record<string, string> {
    const values: Record<string, string> = {};
    for (const [key, raw] of Object.entries(sp)) {
        if (key === 'mode' || key === 'category') continue;
        if (typeof raw === 'string' && raw.length > 0) values[key] = raw;
    }
    return values;
}

export default async function SubmitRunPage({
    params,
    searchParams,
}: PageProps) {
    const { game: slug } = await params;
    if (!slug) notFound();
    const sp = await searchParams;
    const initialMode = sp.mode === 'claim' ? 'claim' : 'submit';
    const h1 =
        initialMode === 'claim' ? 'Claim an existing time' : 'Submit a run';

    // Full query string round-trips through sign-in so a deep link (mode,
    // category, subcategory params) survives the Twitch OAuth detour.
    const loginQs = new URLSearchParams(
        Object.entries(sp).filter(
            (e): e is [string, string] =>
                typeof e[1] === 'string' && e[1].length > 0,
        ),
    ).toString();

    const game = await resolveGame(slug);
    if (!game) notFound();

    const session = await getSession();
    const sessionUsername =
        session?.username && session.username.length > 0
            ? session.username
            : null;

    // Round-trips the board slice this page was reached from — bare params
    // (no category/subcategory) fall back to the bare game URL.
    const initialSubcategoryValues = extractInitialSubcategoryValues(sp);
    const backHref = buildBoardHref(game.name, {
        categorySlug: sp.category,
        subcategoryKey:
            Object.keys(initialSubcategoryValues).length > 0
                ? buildSubcategoryKey(initialSubcategoryValues)
                : undefined,
    });

    const header = (
        <header className={styles.header}>
            {game.image && (
                <img
                    src={game.image}
                    alt={game.display}
                    width={44}
                    height={59}
                    className={styles.cover}
                />
            )}
            <div>
                <div className={styles.eyebrow}>{game.display}</div>
                <h1 className={styles.title}>{h1}</h1>
            </div>
            <BackLink
                href={backHref}
                label="Back to leaderboard"
                className={styles.headerBack}
            />
        </header>
    );

    if (!sessionUsername) {
        return (
            <div className={styles.page}>
                {header}
                <div className={styles.card}>
                    <p className={styles.cardBody}>
                        Sign in with Twitch to{' '}
                        {initialMode === 'claim'
                            ? 'claim a time'
                            : 'submit a run'}
                        .
                    </p>
                    <TwitchLoginButton
                        url={`/games-v2/${game.name}/submit${loginQs ? `?${loginQs}` : ''}`}
                    />
                </div>
            </div>
        );
    }

    const { categories, groups } = await resolveCategory(game.id);
    const activeCategories = categories.filter((c) => !c.archived);

    if (activeCategories.length === 0) {
        return (
            <div className={styles.page}>
                {header}
                <div className={styles.card}>
                    <p
                        className={`${styles.cardBody} ${styles.cardMuted} mb-0`}
                    >
                        This game has no categories to submit to yet.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            {header}
            <div className={styles.formShell}>
                <SubmitForm
                    game={{
                        id: game.id,
                        name: game.name,
                        display: game.display,
                    }}
                    categories={activeCategories}
                    groups={groups}
                    initialMode={initialMode}
                    initialCategorySlug={sp.category}
                    initialSubcategoryValues={initialSubcategoryValues}
                />
            </div>
        </div>
    );
}

export async function generateMetadata({
    params,
    searchParams,
}: PageProps): Promise<Metadata> {
    const { game: slug } = await params;
    if (!slug) return buildMetadata();
    const sp = await searchParams;
    const isClaim = sp.mode === 'claim';
    const game = await resolveGame(slug);
    const display = game?.display ?? safeDecodeURI(slug);
    return buildMetadata({
        title: isClaim
            ? `Claim an existing time — ${display}`
            : `Submit a run — ${display}`,
        description: isClaim
            ? `Claim or correct your time for ${display} on the leaderboards.`
            : `Submit a run for ${display} to the leaderboards.`,
        images: await getGameImage(display),
    });
}
