import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { loadConsoleChrome } from '../../console/load-chrome';
import { SubrouteChrome } from '../../console/subroute-chrome';
import { RosterView } from './roster-view';

interface Props {
    params: Promise<{ game: string }>;
    searchParams: Promise<{ categoryId?: string }>;
}

export default async function RosterPage({ params, searchParams }: Props) {
    const { game: slug } = await params;
    const { categoryId: categoryIdRaw } = await searchParams;
    if (!slug) notFound();

    const session = await getSession();
    if (!session?.username) notFound();

    const game = await resolveGame(slug);
    if (!game) notFound();
    if (!canModerateGame(session, game.name)) notFound();

    const { categories } = await resolveCategory(game.id);

    const parsed = categoryIdRaw ? Number.parseInt(categoryIdRaw, 10) : NaN;
    const selectedCategoryId =
        Number.isFinite(parsed) && categories.some((c) => c.id === parsed)
            ? parsed
            : (categories[0]?.id ?? null);

    const chrome = await loadConsoleChrome(session, game);

    return (
        <SubrouteChrome
            game={game}
            categories={chrome.categories}
            flags={chrome.flags}
            attentionCount={chrome.attentionCount}
            activeItem="roster"
        >
            <RosterView
                gameSlug={game.name}
                gameDisplay={game.display}
                categories={categories.map((c) => ({
                    id: c.id,
                    display: c.display,
                }))}
                initialCategoryId={selectedCategoryId}
            />
        </SubrouteChrome>
    );
}
