'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type { SelfVerify } from '../../../../../../../types/leaderboards.types';
import { InlineError, SegmentedControl } from '../../shared/form-kit';
import {
    loadSelfVerifyAction,
    saveSelfVerifyAction,
} from './actions/self-verify.action';
import { SettingRow } from './settings-editor';
import styles from './settings-editor.module.scss';

const OPTIONS: Array<{ value: SelfVerify; label: string }> = [
    { value: 'nobody', label: 'Nobody' },
    { value: 'admin', label: 'Board admins' },
    { value: 'mod', label: 'Moderators' },
    { value: 'verifier', label: 'Verifiers' },
];

const LABEL = 'Who is allowed to self-verify?';

/** The game-wide answer to who may verify their own runs. Board admins
 *  change it; moderators read it. */
export function SelfVerifySetting({
    gameSlug,
    canEdit,
}: {
    gameSlug: string;
    canEdit: boolean;
}) {
    const [loaded, setLoaded] = useState<{
        gameId: number;
        selfVerify: SelfVerify;
    } | null>(null);
    const [value, setValue] = useState<SelfVerify>('nobody');
    const [error, setError] = useState<string | null>(null);
    const [isSaving, startSave] = useTransition();

    useEffect(() => {
        let live = true;
        loadSelfVerifyAction(gameSlug).then((res) => {
            if (!live) return;
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setLoaded(res);
            setValue(res.selfVerify);
        });
        return () => {
            live = false;
        };
    }, [gameSlug]);

    if (!loaded) return error ? <InlineError>{error}</InlineError> : null;

    const dirty = value !== loaded.selfVerify;
    const save = () =>
        startSave(async () => {
            const res = await saveSelfVerifyAction(
                gameSlug,
                loaded.gameId,
                value,
            );
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setError(null);
            setLoaded({ ...loaded, selfVerify: value });
            toast.success('Saved');
        });

    return (
        <section className={styles.panel}>
            <SettingRow
                label={LABEL}
                hint="Each option includes the roles above it."
            >
                {canEdit ? (
                    <SegmentedControl
                        label={LABEL}
                        labelHidden
                        value={value}
                        options={OPTIONS}
                        onChange={(v) => setValue(v as SelfVerify)}
                        disabled={isSaving}
                    />
                ) : (
                    <div className={styles.readValue}>
                        {OPTIONS.find((o) => o.value === value)?.label}
                    </div>
                )}
            </SettingRow>
            <div className={styles.errorSlot}>
                <InlineError>{error}</InlineError>
            </div>
            {canEdit && dirty && (
                <div className={styles.footer}>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setValue(loaded.selfVerify)}
                        disabled={isSaving}
                    >
                        Reset
                    </button>
                    <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={save}
                        disabled={isSaving}
                    >
                        {isSaving ? 'Saving…' : 'Save'}
                    </button>
                </div>
            )}
        </section>
    );
}
