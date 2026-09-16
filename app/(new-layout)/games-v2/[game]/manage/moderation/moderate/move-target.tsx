'use client';

import { type ReactNode, useMemo, useState } from 'react';
import { buildSubcategoryKey } from '~src/lib/variables/keys';
import type { AffectedLeaderboard } from '../../../../../../../types/moderation.types';
import {
    defaultCanonicalOf,
    SubcategoryBands,
    subcategoryVariablesFor,
} from '../../boards/subcategory-bands';
import { subcategoryLabel } from '../worklist/worklist-model';
import styles from './moderate-panel.module.scss';
import type { SheetBoard, SheetContext } from './subject';

export interface MoveTarget {
    /** Back to the source board, nothing picked. */
    reset: () => void;
    /** The picked board, or null while it is the source board or none. */
    target: AffectedLeaderboard | null;
    /** True while the pick is the source board (or there is no pick). */
    same: boolean;
    /** "70 Star · No emulator" for the picked board. */
    toName: string;
    fields: (busy: boolean) => ReactNode;
}

/** The board picker for Move: same boards the board's own Move offers. */
export function useMoveTarget(
    board: SheetBoard,
    context: SheetContext,
): MoveTarget {
    const [categoryId, setCategoryId] = useState<number>(board.categoryId);
    const [values, setValues] = useState<Record<string, string>>({});

    const targets = useMemo(
        () =>
            context.categories.filter(
                (c) =>
                    (!c.archived && (c.isMain ?? false)) ||
                    c.id === board.categoryId,
            ),
        [context.categories, board.categoryId],
    );
    const category = targets.find((c) => c.id === categoryId) ?? null;
    const subVars = useMemo(
        () =>
            category
                ? subcategoryVariablesFor(category.id, context.variables)
                : [],
        [category, context.variables],
    );
    const key = useMemo(
        () =>
            subVars.length === 0
                ? ''
                : buildSubcategoryKey(
                      subVars.map((v) => ({
                          name: v.nameNormalized,
                          value:
                              values[v.nameNormalized] ?? defaultCanonicalOf(v),
                      })),
                  ),
        [subVars, values],
    );
    const same =
        category == null ||
        (category.id === board.categoryId && key === board.subcategoryKey);
    const sub = category
        ? subcategoryLabel(
              { categoryId: category.id, subcategoryKey: key },
              context.variables,
          )
        : '';
    const toName = category
        ? sub
            ? `${category.display} · ${sub}`
            : category.display
        : '';

    const fields = (busy: boolean) => (
        <div className={styles.fieldStack}>
            <select
                aria-label="Board"
                className="form-select form-select-sm"
                value={categoryId}
                onChange={(e) => {
                    setCategoryId(Number(e.target.value));
                    setValues({});
                }}
                disabled={busy}
            >
                {targets.map((c) => (
                    <option key={c.id} value={c.id}>
                        {c.display}
                    </option>
                ))}
            </select>
            <SubcategoryBands
                variables={subVars}
                selectedValues={values}
                onSelect={(name, canonical) =>
                    setValues((prev) => ({
                        ...prev,
                        [name]: canonical,
                    }))
                }
                idPrefix="moderate-move"
            />
        </div>
    );

    return {
        reset: () => {
            setCategoryId(board.categoryId);
            setValues({});
        },
        target:
            category && !same
                ? { categoryId: category.id, subcategoryKey: key }
                : null,
        same,
        toName,
        fields,
    };
}
