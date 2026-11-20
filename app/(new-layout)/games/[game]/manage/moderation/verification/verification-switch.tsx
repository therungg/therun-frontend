'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { updateGameMetadataAction } from '../../../setup/actions/update-game-metadata.action';
import { InlineError, SegmentedControl } from '../../shared/form-kit';
import { SettingRow } from './settings-editor';
import styles from './settings-editor.module.scss';

const OPTIONS = [
    { value: 'on', label: 'On' },
    { value: 'off', label: 'Off' },
];

const LABEL = 'Verification';

export function VerificationSwitch({
    gameSlug,
    gameId,
    verificationOn,
    canEdit,
    onSaved,
}: {
    gameSlug: string;
    gameId: number;
    verificationOn: boolean;
    canEdit: boolean;
    onSaved: (verificationOn: boolean) => void;
}) {
    const router = useRouter();
    const [value, setValue] = useState(verificationOn);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, startSave] = useTransition();

    const dirty = value !== verificationOn;
    const save = () =>
        startSave(async () => {
            const res = await updateGameMetadataAction({
                gameSlug,
                gameId,
                verificationOn: value,
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setError(null);
            onSaved(value);
            router.refresh();
            toast.success('Saved');
        });

    return (
        <section className={styles.panel}>
            <SettingRow
                label={LABEL}
                hint="Off: timer runs show right away and nothing is reviewed."
            >
                {canEdit ? (
                    <SegmentedControl
                        label={LABEL}
                        labelHidden
                        value={value ? 'on' : 'off'}
                        options={OPTIONS}
                        onChange={(v) => setValue(v === 'on')}
                        disabled={isSaving}
                    />
                ) : (
                    <div className={styles.readValue}>
                        {verificationOn ? 'On' : 'Off'}
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
                        onClick={() => setValue(verificationOn)}
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
