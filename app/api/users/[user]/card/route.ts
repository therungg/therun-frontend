import { NextRequest } from 'next/server';
import { apiResponse } from '~app/api/response';
import { parseGameTheme } from '~src/lib/game-theme';
import { getUserCard } from '~src/lib/get-user-card';
import { getThemeSettings } from '~src/lib/theme-settings';

/**
 * The runner's own theme when they chose to wear it on their profile. Their
 * main game's theme or none leaves the card as it always looks. Read through
 * the settings cache, which a settings save clears; a failed read is no theme.
 */
async function ownThemeOf(user: string) {
    try {
        const settings = await getThemeSettings(user);
        return settings.profileTheme === 'own'
            ? parseGameTheme(settings.theme)
            : null;
    } catch {
        return null;
    }
}

/**
 * Backs the site-wide hover card. Long CDN cache with a day of
 * stale-while-revalidate: the second visitor to hover a given runner is served
 * from the edge and never reaches a function. `?game=` is part of the URL, so
 * the edge keys each user/game pair separately.
 */
export async function GET(
    request: NextRequest,
    props: { params: Promise<{ user: string }> },
) {
    const { user } = await props.params;
    const game = request.nextUrl.searchParams.get('game');

    const [profile, ownTheme] = await Promise.all([
        getUserCard(user, game || null),
        ownThemeOf(user),
    ]);

    return apiResponse({
        body: profile ? { ...profile, ownTheme } : null,
        cache: { maxAge: 3600, swr: 86400 },
    });
}
