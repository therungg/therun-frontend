'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import type {
    ResolvedCategory,
    ResolvedGroup,
    ValidCombinations,
    VariableRow,
} from '../../../../../types/leaderboards.types';
import type { EmulatorPolicy } from '../rules/rules-panel';
import { BoardDialog } from '../shared/board-dialog';
import { loadVariablesAction } from '../submit/load-variables.action';
import { buildSubcategoryKey } from '../submit/subcategory-key';
import { StepBoard } from './step-board';
import styles from './submit-run-dialog.module.scss';

export interface SubmitDialogGame {
    id: number;
    name: string;
    display: string;
}

interface Props {
    game: SubmitDialogGame;
    /** Featured, non-archived categories — the same set the board shows. */
    categories: ResolvedCategory[];
    groups: ResolvedGroup[];
    gameRules?: string | null;
    emulatorPolicy?: EmulatorPolicy;
    /** Viewer moderates this game -> they get the runner step. */
    canModerate: boolean;
    /** Null when signed out; the dialog then asks them to sign in. */
    sessionUsername: string | null;
    /** Board the dialog was opened from — category slug and subcategory values. */
    initialCategorySlug?: string | null;
    initialSubcategoryValues?: Record<string, string>;
    open: boolean;
    onClose: () => void;
}

type StepId = 'board' | 'runner' | 'time';

function canonicalDefault(def: VariableRow): string {
    const idx = def.defaultValueIndex ?? 0;
    return def.values[idx]?.[0] ?? def.values[0]?.[0] ?? '';
}

/** Resolves `raw` against a subcategory def's value buckets (case-insensitive), or null. */
function canonicalMatch(def: VariableRow, raw: string): string | null {
    const bucket = def.values.find((aliases) =>
        aliases.some((alias) => alias.toLowerCase() === raw.toLowerCase()),
    );
    return bucket?.[0] ?? null;
}

const STEP_LABELS: Record<StepId, string> = {
    board: 'Board',
    runner: 'Runner',
    time: 'Time',
};

/**
 * Submitting a run, as a dialog on the board.
 *
 * Three steps, the middle one only for moderators: which board, who it is
 * for, and the time itself. Every submission — a runner's own or a mod's on
 * someone else's behalf — lands as a manual time; the two differ only in
 * which endpoint attributes it (see the step-time submit handler).
 */
export function SubmitRunDialog({
    game,
    categories,
    groups,
    gameRules,
    emulatorPolicy,
    canModerate,
    sessionUsername,
    initialCategorySlug,
    initialSubcategoryValues,
    open,
    onClose,
}: Props) {
    const steps: StepId[] = canModerate
        ? ['board', 'runner', 'time']
        : ['board', 'time'];

    const [stepIndex, setStepIndex] = useState(0);
    const step = steps[stepIndex];

    const [categoryId, setCategoryId] = useState<number>(() => {
        if (initialCategorySlug) {
            const match = categories.find(
                (c) =>
                    c.name.toLowerCase() === initialCategorySlug.toLowerCase(),
            );
            if (match) return match.id;
        }
        return categories[0]?.id ?? 0;
    });
    const category = useMemo(
        () => categories.find((c) => c.id === categoryId) ?? categories[0],
        [categories, categoryId],
    );

    const [variables, setVariables] = useState<VariableRow[]>([]);
    const [validCombinations, setValidCombinations] =
        useState<ValidCombinations>({ mode: 'open' });
    const [subcategory, setSubcategory] = useState<Record<string, string>>({});
    const [varsLoading, startVarsTransition] = useTransition();
    const [varsError, setVarsError] = useState(false);
    const [rulesOpen, setRulesOpen] = useState(false);

    // The opening URL's subcategory params apply once, to whichever
    // category's variables load first — not on every later category switch.
    const appliedInitialSubcategory = useRef(false);

    useEffect(() => {
        setRulesOpen(false);
    }, [category?.id]);

    // Load variables whenever the category changes.
    useEffect(() => {
        if (!category) return;
        let cancelled = false;
        setVarsError(false);
        startVarsTransition(async () => {
            try {
                const resp = await loadVariablesAction(
                    game.name,
                    category.name,
                );
                if (cancelled) return;
                setVariables(resp.variables);
                setValidCombinations(resp.validCombinations);
                const sub: Record<string, string> = {};
                for (const def of resp.variables) {
                    if (def.role !== 'subcategory') continue;
                    let matched: string | null = null;
                    if (
                        !appliedInitialSubcategory.current &&
                        initialSubcategoryValues
                    ) {
                        const rawEntry = Object.entries(
                            initialSubcategoryValues,
                        ).find(
                            ([k]) =>
                                k.toLowerCase() ===
                                def.nameNormalized.toLowerCase(),
                        );
                        if (rawEntry)
                            matched = canonicalMatch(def, rawEntry[1]);
                    }
                    sub[def.nameNormalized] = matched ?? canonicalDefault(def);
                }
                appliedInitialSubcategory.current = true;
                setSubcategory(sub);
            } catch {
                if (cancelled) return;
                setVariables([]);
                setValidCombinations({ mode: 'open' });
                setSubcategory({});
                setVarsError(true);
            }
        });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game.name, category?.name]);

    const subcatDefs = variables.filter((v) => v.role === 'subcategory');
    const subcategoryKey = buildSubcategoryKey(subcategory);
    const combinationInvalid =
        validCombinations.mode === 'managed' &&
        !validCombinations.keys.includes(subcategoryKey);

    const boardStepValid = !varsLoading && !combinationInvalid && !!category;

    if (!open) return null;

    if (!sessionUsername) {
        return (
            <BoardDialog
                open={open}
                onClose={onClose}
                labelledBy="submit-run-dialog-title"
                size="md"
            >
                <div className={styles.header}>
                    <h2 id="submit-run-dialog-title" className={styles.title}>
                        Submit a run
                    </h2>
                </div>
                <div className={styles.body}>
                    <p className="mb-0">
                        Sign in with Twitch to submit a run for {game.display}.
                    </p>
                </div>
                <div className={styles.footer}>
                    <button
                        type="button"
                        className={styles.btnSecondary}
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </BoardDialog>
        );
    }

    if (!category) {
        return (
            <BoardDialog
                open={open}
                onClose={onClose}
                labelledBy="submit-run-dialog-title"
                size="md"
            >
                <div className={styles.header}>
                    <h2 id="submit-run-dialog-title" className={styles.title}>
                        Submit a run
                    </h2>
                </div>
                <div className={styles.body}>
                    <p className="mb-0">
                        This game has no categories to submit to yet.
                    </p>
                </div>
                <div className={styles.footer}>
                    <button
                        type="button"
                        className={styles.btnSecondary}
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </BoardDialog>
        );
    }

    return (
        <BoardDialog
            open={open}
            onClose={onClose}
            labelledBy="submit-run-dialog-title"
            size="lg"
        >
            <div className={styles.header}>
                <h2 id="submit-run-dialog-title" className={styles.title}>
                    Submit a run
                </h2>
            </div>

            <div className={styles.body}>
                <ol className={styles.rail}>
                    {steps.map((s, i) => (
                        <li
                            key={s}
                            className={`${styles.railStep} ${
                                i === stepIndex ? styles.railStepActive : ''
                            }`}
                            aria-current={i === stepIndex ? 'step' : undefined}
                        >
                            <span
                                className={`${styles.railDot} ${
                                    i === stepIndex
                                        ? styles.railDotActive
                                        : i < stepIndex
                                          ? styles.railDotDone
                                          : ''
                                }`}
                            >
                                {i + 1}
                            </span>
                            {STEP_LABELS[s]}
                            {i < steps.length - 1 && (
                                <span className={styles.railSep} />
                            )}
                        </li>
                    ))}
                </ol>

                {step === 'board' && (
                    <StepBoard
                        categories={categories}
                        groups={groups}
                        categoryId={categoryId}
                        onCategoryChange={setCategoryId}
                        subcatDefs={subcatDefs}
                        subcategory={subcategory}
                        onSubcategoryChange={(name, value) =>
                            setSubcategory((prev) => ({
                                ...prev,
                                [name]: value,
                            }))
                        }
                        varsLoading={varsLoading}
                        varsError={varsError}
                        combinationInvalid={combinationInvalid}
                        gameRules={gameRules}
                        categoryRules={category.rules}
                        emulatorPolicy={emulatorPolicy}
                        rulesOpen={rulesOpen}
                        onToggleRules={() => setRulesOpen((o) => !o)}
                    />
                )}
            </div>

            <div className={styles.footer}>
                {stepIndex > 0 && (
                    <button
                        type="button"
                        className={styles.btnSecondary}
                        onClick={() => setStepIndex((i) => i - 1)}
                    >
                        Back
                    </button>
                )}
                <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={onClose}
                >
                    Cancel
                </button>
                {stepIndex < steps.length - 1 && (
                    <button
                        type="button"
                        className={styles.btnPrimary}
                        disabled={step === 'board' && !boardStepValid}
                        onClick={() => setStepIndex((i) => i + 1)}
                    >
                        Next
                    </button>
                )}
            </div>
        </BoardDialog>
    );
}
