'use client';
import React from 'react';
import { Check2, Clipboard, Eye, EyeSlash } from 'react-bootstrap-icons';
import styles from './livesplit.module.scss';
import { resetUploadKeyAction } from './reset-upload-key.action';

interface CopyUploadKeyProps {
    uploadKey: string;
}

export const CopyUploadKey: React.FunctionComponent<CopyUploadKeyProps> = ({
    uploadKey: initialKey,
}) => {
    const [uploadKey, setUploadKey] = React.useState(initialKey);
    const [isRevealed, setIsRevealed] = React.useState(false);
    const [isCopied, setIsCopied] = React.useState(false);
    const [isResetting, setIsResetting] = React.useState(false);
    const [showConfirm, setShowConfirm] = React.useState(false);
    const [resetError, setResetError] = React.useState<string | null>(null);
    const [wasReset, setWasReset] = React.useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(uploadKey);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleReset = async () => {
        setIsResetting(true);
        setResetError(null);
        try {
            const result = await resetUploadKeyAction();
            if (result.error) {
                setResetError(result.error);
            } else if (result.uploadKey) {
                setUploadKey(result.uploadKey);
                setIsRevealed(true);
                setShowConfirm(false);
                setWasReset(true);
            }
        } catch {
            setResetError('The key could not be reset. Try again.');
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <section className={styles.keyPanel} aria-labelledby="livesplit-key">
            <div className={styles.keyHead}>
                <h2 id="livesplit-key" className={styles.keyTitle}>
                    Your key
                </h2>
                {!showConfirm && (
                    <button
                        type="button"
                        className={styles.quiet}
                        onClick={() => setShowConfirm(true)}
                    >
                        Reset key
                    </button>
                )}
            </div>

            <div className={styles.keyRow}>
                <code className={styles.keyValue}>
                    {isRevealed ? uploadKey : '•'.repeat(24)}
                </code>
                <button
                    type="button"
                    className={styles.pill}
                    onClick={() => setIsRevealed((prev) => !prev)}
                >
                    {isRevealed ? (
                        <EyeSlash size={14} aria-hidden />
                    ) : (
                        <Eye size={14} aria-hidden />
                    )}
                    {isRevealed ? 'Hide' : 'Show'}
                </button>
                <button
                    type="button"
                    className={styles.copy}
                    onClick={handleCopy}
                >
                    {isCopied ? (
                        <Check2 size={14} aria-hidden />
                    ) : (
                        <Clipboard size={14} aria-hidden />
                    )}
                    {isCopied ? 'Copied' : 'Copy'}
                </button>
            </div>

            <p className={styles.keyNote}>
                {wasReset
                    ? 'This is your new key. Paste it into LiveSplit again.'
                    : 'Anyone with this key can upload runs to your profile.'}
            </p>

            {showConfirm && (
                <div className={styles.confirm}>
                    <p className={styles.confirmText}>
                        Your current key stops working right away. LiveSplit
                        needs the new one before it uploads again.
                    </p>
                    {resetError && (
                        <p className={styles.error} role="alert">
                            {resetError}
                        </p>
                    )}
                    <div className={styles.confirmActions}>
                        <button
                            type="button"
                            className={styles.danger}
                            onClick={handleReset}
                            disabled={isResetting}
                        >
                            {isResetting ? 'Resetting…' : 'Reset key'}
                        </button>
                        <button
                            type="button"
                            className={styles.pill}
                            onClick={() => {
                                setShowConfirm(false);
                                setResetError(null);
                            }}
                            disabled={isResetting}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
};
