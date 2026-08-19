import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { compareByBoardOrder } from '~src/lib/console/category-order';
import { getGameMetadata } from '~src/lib/game-mgmt';
import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import { listCategoryVariables } from '~src/lib/leaderboard-variables';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { listPolicies } from '~src/lib/moderation/policies';
import { normalizeSlug } from '~src/lib/normalize-slug';
import buildMetadata from '~src/utils/metadata';
import type { ResolvedCategory } from '../../../../../../../types/leaderboards.types';
import type { LevelTemplate } from '../../../../../../../types/levels.types';
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

    const [{ categories, levelTemplates }, metadata] = await Promise.all([
        resolveCategory(game.id),
        getGameMetadata(game.id),
    ]);

    const categoryId = Number.parseInt(rawId, 10);
    if (!Number.isFinite(categoryId)) notFound();
    // Level categories (templates) are served only under pageData's
    // levelTemplates — never in groups/ungrouped — so they are absent from
    // `categories` and have to be resolved separately. The Level categories
    // pane links straight here, so this is a real entry point, not a fallback.
    const template = levelTemplates.find((t) => t.id === categoryId) ?? null;
    const category =
        categories.find((c) => c.id === categoryId) ??
        (template ? templateAsCategory(template) : undefined);
    if (!category) notFound();
    const levelBoardCount = template
        ? categories.filter((c) => c.levelTemplateId === template.id).length
        : 0;

    const chrome = await loadConsoleChrome(session, game);

    // Board order, so prev/next steps the way the public page reads rather
    // than by id. Archived categories stay in the walk — a mod fixing one is
    // exactly who uses prev/next.
    const ordered = [...categories].sort(compareByBoardOrder);
    const index = ordered.findIndex((c) => c.id === categoryId);

    // Copy-from-category needs every category's variables (any category can
    // be the copy source) and the board's policies — loaded here rather than
    // making CategoryEditor fetch them client-side. Skipped for viewers who
    // can't configure anyway (the control never renders for them).
    let copySources: CopySources | undefined;
    if (chrome.flags.canConfigure) {
        const [variables, policies] = await Promise.all([
            listCategoryVariables(
                session.id,
                game.id,
                categories.map((c) => c.id),
            ),
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
                levelTemplates={levelTemplates}
                levelBoardCount={levelBoardCount}
                gameTimingDefaults={{
                    primaryTiming: metadata.primaryTiming,
                    gameTimeLabel: metadata.gameTimeLabel,
                    hideRealTime: metadata.hideRealTime,
                    hideGameTime: metadata.hideGameTime,
                }}
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

/**
 * A level category has no stats row and no group — it is a template, not a
 * board — so the editor gets the shape it needs built from the template's own
 * pageData entry, which carries the same board settings any category entry
 * does. The editor's sections only send the fields the moderator changed, so
 * the two flags pageData does not carry (hideRealTime/hideGameTime, which
 * pageData never carries for any category either) read as their defaults here
 * exactly as they do for a zero-stats category.
 */
function templateAsCategory(template: LevelTemplate): ResolvedCategory {
    return {
        id: template.id,
        name: normalizeSlug(template.display),
        display: template.display,
        primaryTiming: template.primaryTiming ?? 'rt',
        gameTimeLabel: template.gameTimeLabel ?? 'igt',
        isMain: template.isMain,
        archived: false,
        sortOrder: template.sortOrder,
        groupId: null,
        groupName: null,
        imageUrl: template.imageUrl,
        rules: template.rules,
        sortAscending: template.sortAscending ?? true,
        showMilliseconds: template.showMilliseconds ?? true,
        requireVideo: template.requireVideo ?? false,
    };
}
