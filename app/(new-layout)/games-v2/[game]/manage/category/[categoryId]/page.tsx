import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { compareByBoardOrder } from '~src/lib/console/category-order';
import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import { listGameVariables } from '~src/lib/leaderboard-variables';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { listPolicies } from '~src/lib/moderation/policies';
import buildMetadata from '~src/utils/metadata';
import { loadConsoleChrome } from '../../console/load-chrome';
import { SubrouteChrome } from '../../console/subroute-chrome';
import type { CopySources } from '../category-editor';
import { CategoryDetail } from './category-detail';

interface Props {
    params: Promise<{ game: string; categoryId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { game: slug } = await params;
    const game = await resolveGame(slug);
    const display = game?.display ?? slug;
    return buildMetadata({
        title: `Category settings — ${display}`,
        description: `Configure a category on the ${display} leaderboard.`,
    });
}

/**
 * One category's whole configuration on one screen — the destination that
 * replaced six sidebar panes and the sidebar's category picker.
 *
 * Access mirrors the console: any moderator may open it (Minimum time is
 * theirs), and the sections themselves gate on canConfigure.
 */
export default async function CategoryDetailPage({ params }: Props) {
    const { game: slug, categoryId: rawId } = await params;
    if (!slug) notFound();

    const session = await getSession();
    if (!session?.username) notFound();

    const game = await resolveGame(slug);
    if (!game) notFound();
    if (!canModerateGame(session, game.name)) notFound();

    const { categories } = await resolveCategory(game.id);

    const categoryId = Number.parseInt(rawId, 10);
    if (!Number.isFinite(categoryId)) notFound();
    const category = categories.find((c) => c.id === categoryId);
    if (!category) notFound();

    const chrome = await loadConsoleChrome(session, game);

    // Board order, so prev/next steps the way the public page reads rather
    // than by id. Archived categories stay in the walk — a mod fixing one is
    // exactly who uses prev/next.
    const ordered = [...categories].sort(compareByBoardOrder);
    const index = ordered.findIndex((c) => c.id === categoryId);

    // Copy-from-category needs the whole game's variables and policies —
    // both are single already-existing list calls, so load them here rather
    // than making CategoryEditor fetch them client-side. Skipped for viewers
    // who can't configure anyway (the control never renders for them).
    let copySources: CopySources | undefined;
    if (chrome.flags.canConfigure) {
        const [variables, policies] = await Promise.all([
            listGameVariables(session.id, game.id),
            listPolicies(session.id, game.id),
        ]);
        copySources = { categories, variables, policies };
    }

    return (
        <SubrouteChrome
            game={game}
            flags={chrome.flags}
            attentionCount={chrome.attentionCount}
            badgeDegraded={chrome.degradedSources.length > 0}
            moderatedGamesCount={chrome.moderatedGamesCount}
            activeItem="categories"
        >
            <CategoryDetail
                game={game}
                category={category}
                canConfigure={chrome.flags.canConfigure}
                canModerate={chrome.flags.canModerate}
                canEditStandards={chrome.flags.canEditStandards}
                copySources={copySources}
                prev={index > 0 ? ordered[index - 1] : null}
                next={
                    index >= 0 && index < ordered.length - 1
                        ? ordered[index + 1]
                        : null
                }
            />
        </SubrouteChrome>
    );
}
