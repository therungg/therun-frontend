import { Suspense } from 'react';
import { getSession } from '~src/actions/session.action';
import type { GameTheme } from '~src/lib/game-theme';
import { getThemeSettings } from '~src/lib/theme-settings';
import styles from './theme.module.scss';
import { buildThemeCss } from './theme-css';
import { choosePick, pickScript } from './theme-pick';
import { ThemePickSync } from './theme-pick-sync';
import { ThemeStyle } from './theme-style';

type Kind = 'profile' | 'game';

function ThemeLayer({
    theme,
    pick,
}: {
    theme: GameTheme;
    pick: 'page' | 'mine';
}) {
    return (
        <>
            <ThemeStyle css={buildThemeCss(theme, pick)} />
            {theme.backgroundUrl ? (
                <div
                    className={styles.backdrop}
                    data-theme-backdrop={pick}
                    style={{
                        // Keep the JSON quotes: url("...") is a quoted CSS string, so
                        // JSON-escaped backslashes/quotes in the URL can't break out of it.
                        backgroundImage: `url(${JSON.stringify(theme.backgroundUrl)})`,
                    }}
                    aria-hidden
                />
            ) : null}
        </>
    );
}

async function ViewerTheme({
    kind,
    label,
    hasPage,
}: {
    kind: Kind;
    label: string;
    hasPage: boolean;
}) {
    const session = await getSession();
    const viewer = session.username
        ? await getThemeSettings(session.username).catch(() => null)
        : null;
    const pick = choosePick({ hasPage, kind, viewer });
    const page = hasPage ? { label } : null;
    const mine = !!viewer?.theme;
    // A runner's background image belongs to their own profile. Worn anywhere
    // else (a board, someone else's profile) their theme keeps its colours
    // but drops the image, and panels go opaque as they do without one.
    const ownProfile =
        kind === 'profile' &&
        label.toLowerCase() === session.username?.toLowerCase();
    const mineTheme =
        viewer?.theme && !ownProfile
            ? { ...viewer.theme, backgroundUrl: null }
            : (viewer?.theme ?? null);
    return (
        <>
            {mineTheme ? <ThemeLayer theme={mineTheme} pick="mine" /> : null}
            {pick !== (hasPage ? 'page' : 'none') ? (
                <script
                    dangerouslySetInnerHTML={{ __html: pickScript(pick, kind) }}
                />
            ) : null}
            <ThemePickSync kind={kind} pick={pick} page={page} mine={mine} />
        </>
    );
}

/**
 * The theme a profile or board page wears: the page's own theme renders with
 * the page (no flash); the signed-in viewer's theme and their override arrive
 * in the Suspense part. Every theme goes through buildThemeCss + the backdrop
 * scrim, the same rendering games-v2 boards have always used. Rendered only on
 * public profile and board pages, never the /manage, /setup or /run consoles.
 */
export function PageTheme({
    kind,
    label,
    theme,
}: {
    kind: Kind;
    label: string;
    theme: GameTheme | null;
}) {
    const hasPage = theme !== null;
    return (
        <>
            {theme ? <ThemeLayer theme={theme} pick="page" /> : null}
            <script
                dangerouslySetInnerHTML={{
                    __html: pickScript(hasPage ? 'page' : 'none', kind),
                }}
            />
            <Suspense
                fallback={
                    <ThemePickSync
                        kind={kind}
                        pick={hasPage ? 'page' : 'none'}
                        page={hasPage ? { label } : null}
                        mine={false}
                    />
                }
            >
                <ViewerTheme kind={kind} label={label} hasPage={hasPage} />
            </Suspense>
        </>
    );
}
