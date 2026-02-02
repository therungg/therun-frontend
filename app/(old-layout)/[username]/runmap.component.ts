import { Run } from '~src/common/types';

export const getRunmap = (runs: Run[]): Map<string, Run[]> => {
    const runMap: Map<string, Run[]> = new Map();
    const uniqueVariantCount: Map<string, string[]> = new Map();

    if (!runs) return runMap;

    runs.filter((run) => !!run.game).forEach((run: Run) => {
        const variants: string[] = [];

        if (run.platform) {
            variants.push(`Platform:${run.platform}`);
        }

        if (run.emulator) {
            variants.push('Uses Emulator: Yes');
        }

        if (run.gameregion) {
            variants.push(`Region:${run.gameregion}`);
        }

        if (run.variables) {
            Object.entries(run.variables).forEach(([k, v]) => {
                variants.push(`${k}:${v}`);
            });
        }

        let runName = run.game;

        if (variants.length > 0) {
            runName += `#${variants.join('#')}`;

            if (!uniqueVariantCount.has(run.game)) {
                uniqueVariantCount.set(run.game, []);
            }

            const count = uniqueVariantCount.get(run.game);
            if (count) {
                count.push(runName);
                uniqueVariantCount.set(run.game, count);
            }
        }

        if (!runMap.has(runName)) {
            runMap.set(runName, []);
        }

        const map = runMap.get(runName) as Run[];
        map.push(run);
        runMap.set(runName, map);
    });

    uniqueVariantCount.forEach((variants, game) => {
        if (variants.length !== 1) return;

        if (!runMap.has(game)) return;

        const variantName = variants[0];

        const currentVariantRuns = runMap.get(variantName);

        // TODO: Keep this in mind.
        // Updating TS will likely allow us to remove the optional chaining to correctly have fallthrough types from the previous `.has()` check
        runMap.get(game)?.forEach((run) => {
            currentVariantRuns?.push(run);
        });

        if (currentVariantRuns) {
            runMap.set(variantName, currentVariantRuns);
        }
        runMap.delete(game);
    });

    const sortedRunMap: Map<string, Run[]> = new Map(
        [...runMap].sort((a, b) => {
            const aHasHighlighted = a[1].find((run) => run.highlighted);
            const bHasHighlighted = b[1].find((run) => run.highlighted);

            if (aHasHighlighted && bHasHighlighted) {
                if (a[0] == b[0]) return 0;
                return a[0] > b[0] ? 1 : -1;
            }
            if (aHasHighlighted) {
                return -1;
            }
            if (bHasHighlighted) {
                return 1;
            }
            return 0;
        }),
    );

    sortedRunMap.forEach((values, key) => {
        values.sort((a, b) => {
            if (a.highlighted && b.highlighted) {
                return a.run > b.run ? 1 : -1;
            }
            if (a.highlighted) {
                return -1;
            }
            if (b.highlighted) {
                return 1;
            }
            return 0;
        });

        sortedRunMap.set(key, values);
    });

    return sortedRunMap;
};
