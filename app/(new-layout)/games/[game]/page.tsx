import { subject as caslSubject } from '@casl/ability';
import type { Metadata } from 'next';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { canSeeBoards } from '~src/lib/board-access';
import { getMyBoardClaim } from '~src/lib/board-claims';
import { getGameMetadata } from '~src/lib/game-mgmt';
import { listGameModerators } from '~src/lib/game-moderators';
import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import { getVariables } from '~src/lib/leaderboards-v1';
import { getPublicModLog } from '~src/lib/moderation/public-mod-log';
import { selfAnonymizeState } from '~src/lib/moderation/self-service';
import { normalizeSlug } from '~src/lib/normalize-slug';
import {
    getAllActiveRacesByGame,
    getRaceGameStatsByGame,
} from '~src/lib/races';
import { selectCategory } from '~src/lib/select-category';
import { normalizeVariableName } from '~src/lib/variables/keys';
import { defineAbilityFor } from '~src/rbac/ability';
import buildMetadata, { getGameImage } from '~src/utils/metadata';
import { safeDecodeURI } from '~src/utils/uri';
import type { ClaimCtaState } from './claim/claim-cta';
import { loadGamePageData } from './data';
import { hasExtensions, splitExtensions } from './extensions/scope';
import { GamePage } from './game-page';
import { hasLevels } from './levels/order';
import { loadGameOverviewData } from './overview/data';
import { GameOverviewPage } from './overview/overview-page';
import { decideGameRootView } from './root-view';
import { toInitialSearch } from './submit-dialog/submit-params';
import { PageTheme } from './theme/page-theme';
import type { GamePageSearchParams } from './types';

export const maxDuration = 60;

interface PageProps {
    params: Promise<{ game: string }>;
    searchParams: Promise<GamePageSearchParams>;
}

export default async function GameRoutePage({
    params,
    searchParams,
}: PageProps) {
    const { game } = await params;
    const sp = await searchParams;
    if (!game) notFound();

    // The session gate reads nothing off the game and the lookup reads
    // nothing off the session, so neither waits for the other.
    const [session, resolvedGame] = await Promise.all([
        getSession(),
        resolveGame(game),
    ]);
    if (!canSeeBoards(session)) notFound();
    const sessionUsername =
        session?.username && session.username.length > 0
            ? session.username
            : null;

    if (!resolvedGame) notFound();
    if (
        resolvedGame.redirectedToGameId != null &&
        resolvedGame.redirectedToSlug
    ) {
        // A link to one of the merged game's boards goes to THAT board on
        // the game it merged into, not to the front door. The merged game's
        // own page data still lists where each of its boards went, and the
        // slug can differ: seventy of Super Mario 64's extensions share a
        // name with a main board and took a suffix on the way in, so
        // carrying `?board=16star` across unchanged would land on the main
        // game's 16 Star.
        const onward = new URLSearchParams(
            Object.entries(sp).filter(
                (e): e is [string, string] => typeof e[1] === 'string',
            ),
        );
        if (typeof sp.board === 'string') {
            const { mergedInto } = await resolveCategory(resolvedGame.id);
            const movedTo = mergedInto.get(sp.board);
            if (movedTo) onward.set('board', movedTo);
            else onward.delete('board');
        }
        // Nobody typed the merged game's URL to see the main game's front
        // door: they wanted its boards, and those now sit on the Extensions
        // tab of the game that took them. A link to one specific board still
        // goes to that board; everything else lands on the tab -- when the
        // target game has one. A merge that folded the boards into the main
        // wall has no tab to land on, and the front door is right.
        let landing = '';
        if (!onward.has('board')) {
            const target = await resolveGame(resolvedGame.redirectedToSlug);
            if (target) {
                const targetBoards = await resolveCategory(target.id);
                if (
                    hasExtensions(targetBoards.categories, targetBoards.groups)
                ) {
                    landing = '/extensions';
                }
            }
        }
        const query = onward.toString();
        permanentRedirect(
            `/games/${encodeURIComponent(resolvedGame.redirectedToSlug)}${landing}${
                query ? `?${query}` : ''
            }`,
        );
    }

    const catalog = await resolveCategory(resolvedGame.id);
    const {
        categories: allCategories,
        groups: allGroups,
        landingView,
        mergedInto,
    } = catalog;
    // The game's own boards. A merged-in Category Extensions board lives on
    // its own tab: the wall, the landing decision and the Levels tab are all
    // about the game itself. An extensions board opened by `?board=` still
    // resolves — the board loader picks its set from the board it is given.
    const { own, extensions } = splitExtensions(allCategories, allGroups);
    const boardIsExtension =
        typeof sp.board === 'string' &&
        extensions.categories.some((c) => c.name === sp.board);
    const { categories, groups } = boardIsExtension ? extensions : own;
    const showExtensions = hasExtensions(allCategories, allGroups);

    // A board that was merged away keeps its slug, so every link and
    // bookmark pointing at it would otherwise land on a board with no runs
    // left on it. Send them to the board that took them, the same way the
    // game-level redirect above does for a whole game.
    if (typeof sp.board === 'string') {
        const movedTo = mergedInto.get(sp.board);
        if (movedTo) {
            const onward = new URLSearchParams(
                Object.entries(sp).filter(
                    (e): e is [string, string] => typeof e[1] === 'string',
                ),
            );
            onward.set('board', movedTo);
            permanentRedirect(
                `/games/${encodeURIComponent(game)}?${onward.toString()}`,
            );
        }
    }
    // The page's own query string, handed to whichever view renders so a
    // `?submit=1` deep link opens the submit dialog on arrival. Rebuilt from
    // `sp` rather than read from the request, which a Server Component has no
    // direct access to.
    const initialSearch = toInitialSearch(sp);

    // Links minted before the board moved to `?board=` carry it in `?category=`.
    // Move them across when the value names a real board; when it doesn't, leave
    // it be — on a game with a "Category" variable that is a subcategory value,
    // and rewriting it would send a legitimate link to the wall.
    if (!sp.board && sp.category) {
        const legacy = sp.category;
        const norm = normalizeSlug(legacy);
        const match = categories.find(
            (c) =>
                !c.archived &&
                c.isMain &&
                (c.name === legacy || normalizeSlug(c.name) === norm),
        );
        // The picker also writes `?category=<value>` when a game defines a
        // subcategory variable literally named "Category" — indistinguishable
        // from the legacy param by key alone. Cheapest disambiguation without
        // loading every featured category's variables up front: fetch the
        // matched category's own defs (cached for hours) and check whether
        // the value is actually one of that variable's values rather than a
        // board name that happens to collide with it.
        let isPickerValue = false;
        if (match) {
            const { variables } = await getVariables(
                resolvedGame.name,
                match.name,
            ).catch(() => ({ variables: [] }));
            const categoryVar = variables.find(
                (v) =>
                    v.role === 'subcategory' && v.nameNormalized === 'category',
            );
            if (categoryVar) {
                const normVal = normalizeVariableName(legacy);
                isPickerValue = categoryVar.values.some((bucket) =>
                    bucket.some(
                        (alias) => normalizeVariableName(alias) === normVal,
                    ),
                );
            }
        }
        if (match && !isPickerValue) {
            const q = new URLSearchParams(
                Object.entries(sp).filter(
                    (e): e is [string, string] => typeof e[1] === 'string',
                ),
            );
            q.delete('category');
            q.set('board', legacy);
            redirect(
                `/games/${encodeURIComponent(resolvedGame.name)}?${q.toString()}`,
            );
        }
    }

    const decision = decideGameRootView(
        categories,
        sp.board,
        groups,
        landingView,
        sp.view,
    );
    if (decision.view === 'redirect') {
        redirect(`/games/${encodeURIComponent(resolvedGame.name)}`);
    }
    // Standings is its own route, with its own data, skeleton and metadata —
    // the root hands off rather than rendering it in place.
    if (decision.view === 'standings') {
        redirect(
            `/games/${encodeURIComponent(resolvedGame.name)}/standings${
                initialSearch ? `?${initialSearch}` : ''
            }`,
        );
    }

    const ability = defineAbilityFor(session);
    const canManage = ability.can(
        'edit',
        caslSubject('category-settings', { game: resolvedGame.name }),
    );
    const canManageRuns = ability.can(
        'edit',
        caslSubject('leaderboard', { game: resolvedGame.name }),
    );
    const canSiteBan = ability.can('moderate', 'admins');

    const boardView = sp.view === 'moderation' ? 'moderation' : 'board';

    // Everything below needs the game and the decided view, and nothing
    // below needs anything else below: the sidebar's panels, the claim CTA,
    // the board itself and the public mod log all start together.
    //
    // Fetched unconditionally now: the sidebar's Moderators panel needs it
    // on every board view, not just the claim-CTA path.
    // Race data rides along: the race API keys on the DISPLAY name. Both
    // calls fail soft — a race-API blip must never take down a game page.
    // `selfHidden` rides along: "am I hidden on this game's boards?" is a
    // per-session read (bearer token), so it can't live in the cache-shared
    // `loadGamePageData`, but it must not cost a serial round trip on the
    // critical path either. Fails soft — a board still renders if
    // /v1/me/anonymize is down, it just can't offer the un-hide control (see
    // LeaderboardPager's `selfHidden`).
    const moderatorsPromise = listGameModerators(resolvedGame.id);
    const claimPromise: Promise<ClaimCtaState | null> =
        sessionUsername && !canManage && !canManageRuns
            ? Promise.all([
                  moderatorsPromise,
                  getMyBoardClaim(session.id, resolvedGame.id).catch(
                      () => null,
                  ),
              ]).then(([mods, myClaim]) => ({
                  gameId: resolvedGame.id,
                  hasModerators: mods.length > 0,
                  myClaimPending: myClaim?.status === 'pending',
              }))
            : Promise.resolve(null);

    const [
        moderators,
        raceStats,
        activeRaces,
        selfHidden,
        gameMeta,
        claim,
        overviewData,
        data,
        initialModLog,
    ] = await Promise.all([
        moderatorsPromise,
        getRaceGameStatsByGame(resolvedGame.display).catch(() => null),
        getAllActiveRacesByGame(resolvedGame.display).catch(() => []),
        session?.id && decision.view === 'board'
            ? selfAnonymizeState(session.id, resolvedGame.id).catch(() => null)
            : Promise.resolve(null),
        // Theme rides along so it never costs a serial round trip. Injected
        // on the board page only (not the shared layout), so /manage etc.
        // stay neutral. Fails soft — a metadata blip just skips theming.
        getGameMetadata(resolvedGame.id).catch(() => null),
        claimPromise,
        decision.view === 'overview' || decision.view === 'empty'
            ? loadGameOverviewData(
                  resolvedGame,
                  decision.view === 'overview' ? decision.featured : [],
                  groups,
                  sessionUsername,
                  sp,
              )
            : Promise.resolve(null),
        // The board itself: it only ever needed the game and the decided
        // category, both of which are in hand. Passing them on keeps the
        // loader off a second `resolveGame`/`resolveCategory`.
        decision.view === 'board'
            ? loadGamePageData(
                  game,
                  { ...sp, category: decision.category.name },
                  sessionUsername,
                  { game: resolvedGame, categories: catalog },
              )
            : Promise.resolve(null),
        // The board's public "Moderation" tab (?view=moderation) — a
        // sibling view of the leaderboard itself, not a separate route.
        // Only fetched when actually viewing it, so a normal board load
        // never pays for it.
        boardView === 'moderation' && decision.view === 'board'
            ? getPublicModLog({ gameId: resolvedGame.id }).catch(() => null)
            : Promise.resolve(null),
    ]);
    const theme = gameMeta?.theme ?? null;
    const showRaces = (raceStats?.stats?.totalRaces ?? 0) > 0;

    if (decision.view === 'overview' || decision.view === 'empty') {
        if (!overviewData) notFound();
        return (
            <>
                <PageTheme
                    kind="game"
                    label={resolvedGame.display}
                    theme={theme}
                />
                <GameOverviewPage
                    data={overviewData}
                    showLevels={hasLevels(own.categories, own.groups)}
                    showExtensions={showExtensions}
                    canManage={canManage}
                    canModerate={canManageRuns}
                    claim={claim}
                    moderators={moderators}
                    showRaces={showRaces}
                    activeRaces={activeRaces}
                    initialSearch={initialSearch}
                />
            </>
        );
    }

    if (!data) notFound();

    return (
        <>
            <PageTheme kind="game" label={resolvedGame.display} theme={theme} />
            <GamePage
                data={data}
                canManage={canManage}
                canManageRuns={canManageRuns}
                canSiteBan={canSiteBan}
                claim={claim}
                moderators={moderators}
                activeRaces={activeRaces}
                showRaces={showRaces}
                view={boardView}
                initialModLog={initialModLog}
                selfHidden={selfHidden}
                initialSearch={initialSearch}
            />
        </>
    );
}

export async function generateMetadata({
    params,
    searchParams,
}: PageProps): Promise<Metadata> {
    const { game } = await params;
    if (!game) return buildMetadata();
    const sp = await searchParams;
    const resolved = await resolveGame(game);
    const display = resolved?.display ?? safeDecodeURI(game);

    let categoryDisplay: string | undefined;
    const boardParam = sp.board ?? sp.category;
    if (resolved && boardParam) {
        // The game-id-keyed catalog, picked from here — the same entry the
        // page render reads, rather than a per-board copy of it.
        const { categories } = await resolveCategory(resolved.id);
        categoryDisplay = selectCategory(categories, boardParam)?.display;
    }

    const title = categoryDisplay
        ? `${display} ${categoryDisplay} — Leaderboard`
        : `${display} — Leaderboards`;

    return buildMetadata({
        title,
        description: `View statistics for ${display}, including categories, top runners, total run time, and more!`,
        images: await getGameImage(display),
        // The game also renders at the site root (`/smo`), so name the one
        // URL to index. `name` is the form /games/<x> always resolves.
        canonical: `/games/${encodeURIComponent(resolved?.name ?? game)}`,
    });
}
