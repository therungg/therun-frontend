import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { TwitchLoginButton } from '~src/components/twitch/TwitchLoginButton';
import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import buildMetadata, { getGameImage } from '~src/utils/metadata';
import { safeDecodeURI } from '~src/utils/uri';
import { BackLink } from '../shared/back-link';
import { SubmitForm } from './submit-form';

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

    if (!sessionUsername) {
        return (
            <div className="container py-4" style={{ maxWidth: '32rem' }}>
                <h1 className="h4 mb-1">{h1}</h1>
                <p className="text-muted mb-4">{game.display}</p>
                <div className="border rounded p-4 text-center">
                    <p className="mb-3">
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
    const activeCategories = categories.filter((c) => c.active !== false);

    if (activeCategories.length === 0) {
        return (
            <div className="container py-4" style={{ maxWidth: '40rem' }}>
                <h1 className="h4 mb-1">{h1}</h1>
                <p className="text-muted mb-4">{game.display}</p>
                <div className="border rounded p-4 text-center text-muted">
                    This game has no categories to submit to yet.
                </div>
            </div>
        );
    }

    return (
        <div className="container py-4" style={{ maxWidth: '40rem' }}>
            <div className="d-flex align-items-center justify-content-between mb-1">
                <h1 className="h4 mb-0">{h1}</h1>
                <BackLink
                    href={`/games-v2/${game.name}`}
                    label="Back to leaderboard"
                />
            </div>
            <p className="text-muted mb-4">{game.display}</p>
            <SubmitForm
                game={{ id: game.id, name: game.name, display: game.display }}
                categories={activeCategories}
                groups={groups}
                initialMode={initialMode}
                initialCategorySlug={sp.category}
                initialSubcategoryValues={extractInitialSubcategoryValues(sp)}
            />
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
