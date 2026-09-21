import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { RunnerOverview } from '~app/(new-layout)/[username]/_overview/runner-overview';
import { CombinedTournamentPage } from '~app/(new-layout)/tournaments/[tournament]/combined-tournament-page';
import { TournamentPage } from '~app/(new-layout)/tournaments/[tournament]/page';
import { getTournamentNameFromSlug } from '~app/(new-layout)/tournaments/tournament-list';
import { JsonLd } from '~src/components/json-ld';
import { getUserRuns } from '~src/lib/get-user-runs';
import { getRunnerProfileHead } from '~src/lib/runner-profile';
import { userHref } from '~src/lib/user-href';
import {
    buildPersonJsonLd,
    formatMillis,
    formatPlaytime,
} from '~src/utils/json-ld';
import buildMetadata, { getUserProfilePhoto } from '~src/utils/metadata';
import { safeDecodeURI } from '~src/utils/uri';
import type { RunnerProfileHead } from '../../../types/runner-profile.types';

interface PageProps {
    params: Promise<{ username: string }>;
    searchParams: Promise<{ [_: string]: string }>;
}

export default async function Page(props: PageProps) {
    const params = await props.params;
    if (!params || !params.username) throw new Error('Username not found');

    const username: string = params.username as string;

    const tournament = getTournamentNameFromSlug(username);

    if (tournament) {
        // Only the tournament branch depends on searchParams — awaiting it up
        // front would make every profile render dynamic.
        const searchParams = await props.searchParams;
        if ('guidingTournament' in tournament) {
            return CombinedTournamentPage({
                params: tournament,
                searchParams,
            });
        } else {
            return TournamentPage({
                params: tournament,
                searchParams,
            });
        }
    }

    const name = safeDecodeURI(username);

    // 'use cache' function: calling it here for the JSON-LD and again inside
    // RunnerOverview costs nothing extra — same args, same render pass, one
    // cache entry. Neither call touches the session, so the page stays
    // statically renderable.
    const head = await getRunnerProfileHead(name);

    // Deleted, banned or anonymised: the API answers as though the account
    // never existed, and so does the page.
    if (!head) notFound();

    return (
        <>
            <JsonLd data={buildRunnerPersonJsonLd(head)} />
            <RunnerOverview name={name} />
        </>
    );
}

/**
 * Structured data for the profile. Built from the runner-profile head that
 * the new overview already fetches, not the legacy per-run fan-out — so a
 * couple of the old fields (total playtime, total attempts, the PB on the
 * favorite run) aren't available here and are left out rather than refetched.
 */
function buildRunnerPersonJsonLd(head: RunnerProfileHead) {
    const descParts = [`${head.runner.name} is a speedrunner on The Run`];
    if (head.mainGame) descParts.push(`Main game: ${head.mainGame.game}`);

    // Board pins are the closest already-fetched substitute for "favorite
    // games by playtime" — the head payload has no per-game playtime totals.
    const pinnedGames = head.pins.flatMap((pin) =>
        pin.type === 'board' ? [pin.game.game] : [],
    );
    const games = Array.from(
        new Set([
            ...(head.mainGame ? [head.mainGame.game] : []),
            ...pinnedGames,
        ]),
    ).slice(0, 5);

    return buildPersonJsonLd({
        username: head.runner.name,
        picture: head.runner.picture ?? undefined,
        description: descParts.join(' | '),
        socials: {
            twitch: head.runner.socials?.twitch,
            youtube: head.runner.socials?.youtube,
            twitter: head.runner.socials?.twitter,
        },
        games,
    });
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
    const params = await props.params;
    const username = params.username;

    if (!username) return buildMetadata();

    const tournament = getTournamentNameFromSlug(username);

    if (tournament) {
        // A combined entry carries several tournaments under a guiding name;
        // a plain one carries the name itself. Concatenating the object gave
        // every tournament slug the title "Speedrun tournament [object
        // Object]", in the tab and in every share preview.
        const name =
            'guidingTournament' in tournament
                ? tournament.guidingTournament
                : tournament.tournament;
        return buildMetadata({
            title: `Speedrun tournament ${name}`,
            description: `Speedrun tournament ${name}`,
        });
    }

    const [runs, images] = await Promise.all([
        getUserRuns(username),
        getUserProfilePhoto(username),
    ]);

    const allRuns = runs || [];
    const favoriteRun =
        allRuns.length > 0
            ? allRuns.reduce((best, run) => {
                  const time = parseInt(run.totalRunTime) || 0;
                  const bestTime = parseInt(best.totalRunTime) || 0;
                  return time > bestTime ? run : best;
              })
            : undefined;

    const totalAttempts = allRuns.reduce(
        (sum, run) => sum + (run.attemptCount || 0),
        0,
    );
    const totalPlaytimeMs = allRuns.reduce(
        (sum, run) => sum + (parseInt(run.totalRunTime) || 0),
        0,
    );

    const descParts = [`${username}'s speedrun stats`];
    if (favoriteRun) {
        const favPb = formatMillis(favoriteRun.personalBest);
        const favLabel = `${favoriteRun.game} - ${favoriteRun.run}`;
        descParts.push(
            `Favorite: ${favLabel}${favPb ? ` (PB: ${favPb})` : ''}`,
        );
    }
    if (totalAttempts > 0)
        descParts.push(`${totalAttempts.toLocaleString()} attempts`);
    const playtime = formatPlaytime(String(totalPlaytimeMs));
    if (playtime) descParts.push(`${playtime} played`);

    return buildMetadata({
        title: username,
        description: descParts.join(' | '),
        images,
        // The profile answers at the root too, but a game can take that name,
        // so `/users/<name>` is the stable one to index.
        canonical: userHref(username),
    });
}
