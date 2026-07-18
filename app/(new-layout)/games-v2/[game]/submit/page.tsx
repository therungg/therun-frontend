import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import Link from '~src/components/link';
import { TwitchLoginButton } from '~src/components/twitch/TwitchLoginButton';
import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import buildMetadata, { getGameImage } from '~src/utils/metadata';
import { safeDecodeURI } from '~src/utils/uri';
import { SubmitForm } from './submit-form';

interface PageProps {
    params: Promise<{ game: string }>;
    searchParams: Promise<{ mode?: string }>;
}

export default async function SubmitRunPage({
    params,
    searchParams,
}: PageProps) {
    const { game: slug } = await params;
    if (!slug) notFound();
    const sp = await searchParams;
    const initialMode = sp.mode === 'claim' ? 'claim' : 'submit';

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
                <h1 className="h4 mb-1">Submit a run</h1>
                <p className="text-muted mb-4">{game.display}</p>
                <div className="border rounded p-4 text-center">
                    <p className="mb-3">Sign in with Twitch to submit a run.</p>
                    <TwitchLoginButton url={`/games-v2/${game.name}/submit`} />
                </div>
            </div>
        );
    }

    const { categories, groups } = await resolveCategory(game.id);
    const activeCategories = categories.filter((c) => c.active !== false);

    if (activeCategories.length === 0) {
        return (
            <div className="container py-4" style={{ maxWidth: '40rem' }}>
                <h1 className="h4 mb-1">Submit a run</h1>
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
                <h1 className="h4 mb-0">Submit a run</h1>
                <Link
                    href={`/games-v2/${game.name}`}
                    className="btn btn-sm btn-outline-secondary"
                >
                    Back to leaderboards
                </Link>
            </div>
            <p className="text-muted mb-4">{game.display}</p>
            <SubmitForm
                game={{ id: game.id, name: game.name, display: game.display }}
                categories={activeCategories}
                groups={groups}
                initialMode={initialMode}
            />
        </div>
    );
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const { game: slug } = await params;
    if (!slug) return buildMetadata();
    const game = await resolveGame(slug);
    const display = game?.display ?? safeDecodeURI(slug);
    return buildMetadata({
        title: `Submit a run — ${display}`,
        description: `Submit a run for ${display} to the leaderboards.`,
        images: await getGameImage(display),
    });
}
