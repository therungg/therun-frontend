import type { VariableRow } from '../../../types/leaderboards.types';
import { normalizeVariableName } from './keys';

/** One value's rules, headed by the label the runner picked. */
export interface ValueRules {
    label: string;
    rules: string;
}

/**
 * The rules carried by the values a board is split by.
 *
 * A subcategory value is part of what the board IS ("Any% · No Death Abuse"),
 * and the source a board is imported from keeps rules on the value, not only
 * on the category. So the rules a runner is held to are the game's, then the
 * category's, then whatever each selected value adds.
 *
 * `selected` maps a variable's key to the value as it is chosen anywhere in
 * the app — a display label or its normalized form, either works.
 */
export function selectedValueRules(
    defs: ReadonlyArray<VariableRow>,
    selected: Record<string, string>,
): ValueRules[] {
    const out: ValueRules[] = [];
    for (const def of defs) {
        if (def.role !== 'subcategory') continue;
        const rules = def.valueRules;
        if (!rules) continue;
        const chosen = selected[def.nameNormalized];
        const wanted = normalizeVariableName(chosen ?? '');
        const bucket =
            (wanted
                ? def.values.find((b) =>
                      b.some(
                          (label) => normalizeVariableName(label) === wanted,
                      ),
                  )
                : undefined) ??
            // Nothing chosen: the board a visitor lands on is the default one.
            (def.defaultValueIndex != null
                ? def.values[def.defaultValueIndex]
                : undefined);
        const label = bucket?.[0];
        if (!label) continue;
        const text = rules[normalizeVariableName(label)];
        if (text?.trim()) out.push({ label, rules: text });
    }
    return out;
}
