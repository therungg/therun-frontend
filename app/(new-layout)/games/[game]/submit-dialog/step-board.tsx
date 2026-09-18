'use client';

import type {
    ResolvedCategory,
    ResolvedGroup,
    VariableRow,
} from '../../../../../types/leaderboards.types';
import {
    type EmulatorPolicy,
    RulesBody,
    RulesPanel,
} from '../rules/rules-panel';
import styles from './submit-run-dialog.module.scss';

interface Props {
    categories: ResolvedCategory[];
    groups: ResolvedGroup[];
    categoryId: number;
    onCategoryChange: (id: number) => void;
    subcatDefs: VariableRow[];
    subcategory: Record<string, string>;
    onSubcategoryChange: (nameNormalized: string, value: string) => void;
    varsLoading: boolean;
    varsError: boolean;
    gameRules?: string | null;
    categoryRules?: string | null;
    emulatorPolicy?: EmulatorPolicy;
    rulesOpen: boolean;
    onToggleRules: () => void;
}

/**
 * Which board the run belongs on: the category, and every subcategory the
 * category splits into. The rules disclosure rides along because this is the
 * step where the runner is agreeing to them.
 */
export function StepBoard({
    categories,
    groups,
    categoryId,
    onCategoryChange,
    subcatDefs,
    subcategory,
    onSubcategoryChange,
    varsLoading,
    varsError,
    gameRules,
    categoryRules,
    emulatorPolicy,
    rulesOpen,
    onToggleRules,
}: Props) {
    return (
        <div className={styles.step}>
            <div>
                <label htmlFor="submit-category" className="form-label">
                    Category
                </label>
                <select
                    id="submit-category"
                    className="form-select"
                    value={categoryId}
                    onChange={(e) => onCategoryChange(Number(e.target.value))}
                >
                    {renderCategoryOptions(categories, groups)}
                </select>
            </div>

            {subcatDefs.map((def) => (
                <div key={def.nameNormalized}>
                    <label
                        htmlFor={`sub-${def.nameNormalized}`}
                        className="form-label"
                    >
                        {def.name}
                    </label>
                    <select
                        id={`sub-${def.nameNormalized}`}
                        className="form-select"
                        value={subcategory[def.nameNormalized] ?? ''}
                        onChange={(e) =>
                            onSubcategoryChange(
                                def.nameNormalized,
                                e.target.value,
                            )
                        }
                        disabled={varsLoading}
                        required
                    >
                        {def.values.map((bucket, idx) => (
                            <option
                                key={`${def.nameNormalized}-${idx}`}
                                value={bucket[0]}
                            >
                                {bucket[0]}
                            </option>
                        ))}
                    </select>
                </div>
            ))}

            {(categoryRules?.trim() || gameRules?.trim() || emulatorPolicy) && (
                <div>
                    <RulesPanel
                        rules={categoryRules}
                        gameRules={gameRules}
                        emulatorPolicy={emulatorPolicy}
                        open={rulesOpen}
                        onToggle={onToggleRules}
                        label="Category rules"
                    />
                    {rulesOpen && (
                        <RulesBody
                            rules={categoryRules}
                            gameRules={gameRules}
                            emulatorPolicy={emulatorPolicy}
                        />
                    )}
                </div>
            )}

            {varsError && (
                <div className="alert alert-warning py-2 mb-0" role="alert">
                    Could not load subcategories for this category. You can
                    still submit; they will use their defaults.
                </div>
            )}
        </div>
    );
}

function renderCategoryOptions(
    categories: ResolvedCategory[],
    groups: ResolvedGroup[],
) {
    if (groups.length === 0) {
        return categories.map((c) => (
            <option key={c.id} value={c.id}>
                {c.display}
            </option>
        ));
    }

    const sortedGroups = [...groups].sort((a, b) => a.sortOrder - b.sortOrder);
    const ungrouped = categories.filter((c) => c.groupId == null);
    const nodes: React.ReactNode[] = [];

    for (const g of sortedGroups) {
        const inGroup = categories.filter((c) => c.groupId === g.id);
        if (inGroup.length === 0) continue;
        nodes.push(
            <optgroup key={`g-${g.id}`} label={g.name}>
                {inGroup.map((c) => (
                    <option key={c.id} value={c.id}>
                        {c.display}
                    </option>
                ))}
            </optgroup>,
        );
    }
    if (ungrouped.length > 0) {
        nodes.push(
            <optgroup key="g-ungrouped" label="Other">
                {ungrouped.map((c) => (
                    <option key={c.id} value={c.id}>
                        {c.display}
                    </option>
                ))}
            </optgroup>,
        );
    }
    return nodes;
}
