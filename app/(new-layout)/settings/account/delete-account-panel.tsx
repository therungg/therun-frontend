'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { PromptDialog } from '~app/(new-layout)/games-v2/[game]/shared/prompt-dialog';
import { deleteAccountAction } from '~src/actions/delete-account.action';
import { useSessionActions } from '~src/components/session-provider';
import styles from './account.module.scss';

export function DeleteAccountPanel({ username }: { username: string }) {
    const router = useRouter();
    const { clear: clearSession } = useSessionActions();
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const submit = (value: string) => {
        setError(null);
        startTransition(async () => {
            const result = await deleteAccountAction(value);
            if ('error' in result) {
                setError(result.error);
                return;
            }
            // The backend already dropped the session. Clear the cookie and
            // the client session state the same way the logout flow in
            // UserMenu does, then leave the settings area — it requires an
            // active session to render.
            await fetch('/api/logout', { method: 'POST' });
            clearSession();
            router.push('/');
        });
    };

    return (
        <section
            className={styles.dangerZone}
            aria-labelledby="delete-account-title"
        >
            <h2 id="delete-account-title" className={styles.dangerZoneTitle}>
                Delete your account
            </h2>
            <p className={styles.dangerZoneBody}>
                This removes your account and your data as described above. It
                cannot be undone.
            </p>
            <button
                type="button"
                className={styles.dangerButton}
                onClick={() => {
                    setError(null);
                    setOpen(true);
                }}
            >
                Delete my account
            </button>

            <PromptDialog
                open={open}
                onClose={() => {
                    if (!pending) setOpen(false);
                }}
                onSubmit={submit}
                labelledBy="delete-account-dialog-title"
                title="Delete your account"
                blurb={`Type ${username} to confirm. This cannot be undone.`}
                fieldLabel="Your username"
                placeholder={username}
                minLength={username.length}
                isValid={(value) =>
                    value.toLowerCase() === username.toLowerCase()
                }
                submitLabel="Delete my account"
                submitVariant="danger"
                pending={pending}
                error={error}
            />
        </section>
    );
}
