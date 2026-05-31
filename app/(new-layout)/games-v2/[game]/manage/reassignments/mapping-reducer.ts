import type {
    CategoryDecision,
    CategoryMappingEntry,
} from '../../../../../../types/reassignments.types';

export interface MappingOverride {
    sourceCategoryId: number;
    decision: CategoryDecision;
    targetCategoryId: number | null;
}

/**
 * Apply a user's per-row override to the preview-supplied mapping.
 * - merge: requires a targetCategoryId.
 * - create: targetCategoryId becomes null (filled at execute time), autoCreated true.
 * - drop: targetCategoryId null, autoCreated false.
 */
export function applyOverride(
    mapping: CategoryMappingEntry[],
    override: MappingOverride,
): CategoryMappingEntry[] {
    return mapping.map((entry) => {
        if (entry.sourceCategoryId !== override.sourceCategoryId) return entry;
        return {
            sourceCategoryId: entry.sourceCategoryId,
            decision: override.decision,
            targetCategoryId:
                override.decision === 'merge'
                    ? override.targetCategoryId
                    : null,
            autoCreated: override.decision === 'create',
        };
    });
}

/** True when every merge decision has a concrete target. */
export function mappingIsComplete(mapping: CategoryMappingEntry[]): boolean {
    return mapping.every(
        (e) => e.decision !== 'merge' || e.targetCategoryId !== null,
    );
}
