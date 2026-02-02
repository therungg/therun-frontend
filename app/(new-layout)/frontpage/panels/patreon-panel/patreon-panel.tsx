import { getAllPatrons } from '~app/(old-layout)/api/patreons/get-all-patrons.action';
import { PatreonPanelView } from './patreon-panel-view';

interface FeaturedPatron {
    name: string;
    tier: number;
    colorPreference: number;
    showIcon: boolean;
}

function weightedRandomSelection<T extends { tier: number }>(
    items: T[],
    count: number,
): T[] {
    if (items.length === 0) return [];
    if (items.length <= count) return items;

    // Weighted selection: Tier 3 -> 3x, Tier 2 -> 2x, Tier 1 -> 1x
    const getTierWeight = (tier: number): number => {
        if (tier >= 3) return 3;
        if (tier === 2) return 2;
        return 1;
    };

    const selected: T[] = [];
    const remaining = [...items];

    for (let i = 0; i < count && remaining.length > 0; i++) {
        // Calculate cumulative weights
        const weights = remaining.map((item) => getTierWeight(item.tier));
        const totalWeight = weights.reduce((a, b) => a + b, 0);

        // Random selection based on weights
        let random = Math.random() * totalWeight;
        let selectedIndex = 0;

        for (let j = 0; j < weights.length; j++) {
            random -= weights[j];
            if (random <= 0) {
                selectedIndex = j;
                break;
            }
        }

        selected.push(remaining[selectedIndex]);
        remaining.splice(selectedIndex, 1);
    }

    return selected;
}

export default async function PatreonPanel() {
    try {
        const patronMap = await getAllPatrons();

        // Filter: featureOnOverview && !hide
        const eligible = Object.entries(patronMap)
            .filter(([_, patron]) => {
                return (
                    patron.preferences &&
                    patron.preferences.featureOnOverview &&
                    !patron.preferences.hide
                );
            })
            .map(([name, patron]) => ({
                name,
                tier: patron.tier,
                colorPreference: patron.preferences.colorPreference,
                showIcon: patron.preferences.showIcon,
            }));

        // Select 2-3 patrons using weighted random selection
        const selectCount = Math.min(3, Math.max(1, eligible.length));
        const featured: FeaturedPatron[] =
            eligible.length > 0
                ? weightedRandomSelection(eligible, selectCount)
                : [];

        return <PatreonPanelView featuredPatrons={featured} />;
    } catch (_error) {
        // Graceful degradation: show CTA without patrons if API fails
        return <PatreonPanelView featuredPatrons={[]} />;
    }
}
