'use client';
import React from 'react';
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
            setResetError('Something went wrong. Please try again.');
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <>
            {wasReset && (
                <div className={styles.resetSuccess}>
                    Key reset successfully. Your new key is shown below — make
                    sure to update it in LiveSplit.
                </div>
            )}
            <div className={styles.statusBadge}>
                <span className={styles.statusDot} />
                Key Active
            </div>
            <div className={styles.keyLabel}>Your LiveSplit Key</div>
            <div className={styles.keyValue}>
                {isRevealed ? uploadKey : '••••••••••••••••••••'}
            </div>
            <div className={styles.keyActions}>
                <button
                    type="button"
                    className={styles.btnReveal}
                    onClick={() => setIsRevealed((prev) => !prev)}
                >
                    {isRevealed ? 'Hide Key' : 'Reveal Key'}
                </button>
                <button
                    type="button"
                    className={styles.btnCopy}
                    onClick={handleCopy}
                >
                    {isCopied ? 'Copied!' : 'Copy to Clipboard'}
                </button>
            </div>
            {isCopied && (
                <div className={styles.copiedFeedback}>Copied to clipboard</div>
            )}
            <div className={styles.keyWarning}>
                Treat this key like a password — anyone with it can upload to
                your profile
            </div>

            <div className={styles.resetSection}>
                {!showConfirm ? (
                    <button
                        type="button"
                        className={styles.btnReset}
                        onClick={() => setShowConfirm(true)}
                    >
                        Reset Key
                    </button>
                ) : (
                    <div className={styles.resetConfirm}>
                        <div className={styles.resetConfirmText}>
                            Are you sure? Your current key will stop working
                            immediately. You will need to add the new key to
                            LiveSplit again.
                        </div>
                        {resetError && (
                            <div className={styles.resetError}>
                                {resetError}
                            </div>
                        )}
                        <div className={styles.resetConfirmActions}>
                            <button
                                type="button"
                                className={styles.btnResetConfirm}
                                onClick={handleReset}
                                disabled={isResetting}
                            >
                                {isResetting
                                    ? 'Resetting...'
                                    : 'Yes, Reset Key'}
                            </button>
                            <button
                                type="button"
                                className={styles.btnReveal}
                                onClick={() => setShowConfirm(false)}
                                disabled={isResetting}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};
