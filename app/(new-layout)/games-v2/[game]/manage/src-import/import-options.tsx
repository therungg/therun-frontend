'use client';

import type { SrcImportCommitFlags } from '../../../../../../types/src-import.types';
import styles from './src-import.module.scss';

export type ResolvedCommitFlags = Required<SrcImportCommitFlags>;

const DEFAULT_FLAGS: ResolvedCommitFlags = {
    importTheme: true,
    themeMode: 'overwrite',
    importMiscCategories: true,
    importLevelCategories: true,
    importPending: true,
    setMinTimeFloor: true,
};

/**
 * Fills every unset flag with its behavior-preserving default — mirrors the
 * backend resolveCommitFlags so the panel shows the effective state even when
 * the job has no commitFlags yet.
 */
export function resolveCommitFlags(
    flags: SrcImportCommitFlags | null | undefined,
): ResolvedCommitFlags {
    return {
        importTheme: flags?.importTheme ?? DEFAULT_FLAGS.importTheme,
        themeMode: flags?.themeMode ?? DEFAULT_FLAGS.themeMode,
        importMiscCategories:
            flags?.importMiscCategories ?? DEFAULT_FLAGS.importMiscCategories,
        importLevelCategories:
            flags?.importLevelCategories ?? DEFAULT_FLAGS.importLevelCategories,
        importPending: flags?.importPending ?? DEFAULT_FLAGS.importPending,
        setMinTimeFloor:
            flags?.setMinTimeFloor ?? DEFAULT_FLAGS.setMinTimeFloor,
    };
}

type ToggleKey = Exclude<keyof SrcImportCommitFlags, 'themeMode'>;

const TOGGLES: Array<{ key: ToggleKey; label: string; hint: string }> = [
    {
        key: 'importTheme',
        label: 'Import board theme',
        hint: 'Apply the source board colors and background to this game.',
    },
    {
        key: 'importMiscCategories',
        label: 'Import miscellaneous categories',
        hint: 'Source “misc” categories, grouped under Miscellaneous.',
    },
    {
        key: 'importLevelCategories',
        label: 'Import individual-level categories',
        hint: 'Per-level (IL) categories and their levels.',
    },
    {
        key: 'importPending',
        label: 'Import unverified runs',
        hint: 'Runs still pending verification at the source (imported as pending).',
    },
    {
        key: 'setMinTimeFloor',
        label: 'Set a minimum-time floor',
        hint: 'Flag impossibly-fast runs (below 90% of the fastest imported time).',
    },
];

interface Props {
    flags: ResolvedCommitFlags;
    disabled: boolean;
    onChange: (patch: SrcImportCommitFlags) => void;
}

export function ImportOptions({ flags, disabled, onChange }: Props) {
    return (
        <details className={styles.options}>
            <summary>Options</summary>
            <div className={styles.optionsBody}>
                {TOGGLES.map((t) => (
                    <label key={t.key} className={styles.checkboxRow}>
                        <input
                            type="checkbox"
                            checked={flags[t.key]}
                            disabled={disabled}
                            onChange={(e) =>
                                onChange({ [t.key]: e.target.checked })
                            }
                        />
                        <span>
                            {t.label}
                            <span className={styles.checkboxHint}>
                                {t.hint}
                            </span>
                        </span>
                    </label>
                ))}
                {flags.importTheme && (
                    <div className={styles.themeModeRow}>
                        <span>When a theme already exists:</span>
                        <select
                            className={styles.themeModeSelect}
                            value={flags.themeMode}
                            disabled={disabled}
                            onChange={(e) =>
                                onChange({
                                    themeMode: e.target.value as
                                        | 'overwrite'
                                        | 'if-unset',
                                })
                            }
                        >
                            <option value="overwrite">Overwrite it</option>
                            <option value="if-unset">
                                Keep it (only set if unset)
                            </option>
                        </select>
                    </div>
                )}
            </div>
        </details>
    );
}
