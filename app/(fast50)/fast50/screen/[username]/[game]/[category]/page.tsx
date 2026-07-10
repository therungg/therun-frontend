import { composeDeck } from '~src/components/fast50/deck/compose-deck';
import { Deck } from '~src/components/fast50/deck/deck';
import { SLIDE_COMPONENTS } from '~src/components/fast50/slides/slide-registry';
import { getRunnerDossier } from '~src/lib/fast50/dossier';

export const metadata = {
    robots: { index: false, follow: false },
};

export default async function DeckPage({
    params,
    searchParams,
}: {
    params: Promise<{ username: string; game: string; category: string }>;
    searchParams: Promise<{ deck?: string }>;
}) {
    const { username, game, category } = await params;
    const { deck } = await searchParams;
    const kind = deck === 'post' ? 'post' : 'pre';
    const dossier = await getRunnerDossier(
        decodeURIComponent(username),
        decodeURIComponent(game),
        decodeURIComponent(category),
        kind,
    );
    if (!dossier) {
        return (
            <main style={{ padding: '20vh 10vw', fontSize: 24 }}>
                No data found for this runner/game/category.
            </main>
        );
    }
    return (
        <Deck
            dossier={dossier}
            slides={composeDeck(dossier)}
            components={SLIDE_COMPONENTS}
        />
    );
}
