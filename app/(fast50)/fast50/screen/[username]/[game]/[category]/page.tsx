import { getSession } from '~src/actions/session.action';
import { composePreppedDeck } from '~src/components/fast50/deck/compose-prepped-deck';
import { Deck } from '~src/components/fast50/deck/deck';
import {
    CUSTOM_SLIDE_COMPONENTS,
    SLIDE_COMPONENTS,
} from '~src/components/fast50/slides/slide-registry';
import { getRunnerDossier } from '~src/lib/fast50/dossier';
import { getPrepSession, listPrepSessions } from '~src/lib/fast50/prep';
import type { PrepSessionData } from '~src/lib/fast50/prep.types';

export const metadata = {
    robots: { index: false, follow: false },
};

export default async function DeckPage({
    params,
    searchParams,
}: {
    params: Promise<{ username: string; game: string; category: string }>;
    searchParams: Promise<{ deck?: string; session?: string }>;
}) {
    const { username, game, category } = await params;
    const { deck, session } = await searchParams;
    const kind = deck === 'post' ? 'post' : 'pre';
    const u = decodeURIComponent(username);
    const g = decodeURIComponent(game);
    const c = decodeURIComponent(category);
    const dossier = await getRunnerDossier(u, g, c, kind);
    if (!dossier) {
        return (
            <main style={{ padding: '20vh 10vw', fontSize: 24 }}>
                No data found for this runner/game/category.
            </main>
        );
    }

    // Prep is best-effort: any failure (no auth, backend down, bad session
    // id) falls back to the pure auto-composed deck.
    let prep: PrepSessionData | null = null;
    if (session !== 'none') {
        try {
            const user = await getSession();
            if (user.id) {
                const requested = session ? Number(session) : undefined;
                if (requested && Number.isInteger(requested) && requested > 0) {
                    prep = (await getPrepSession(user.id, requested)).data;
                } else {
                    const sessions = await listPrepSessions(user.id, u, g, c);
                    if (sessions[0]) {
                        prep = (await getPrepSession(user.id, sessions[0].id))
                            .data;
                    }
                }
            }
        } catch {
            prep = null;
        }
    }

    const { slides } = composePreppedDeck(dossier, prep);
    return (
        <Deck
            dossier={dossier}
            slides={slides}
            prep={prep}
            components={SLIDE_COMPONENTS}
            customComponents={CUSTOM_SLIDE_COMPONENTS}
        />
    );
}
