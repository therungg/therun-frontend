import styles from './customization.module.scss';

interface TierLockProps {
    requiredTier: 2 | 3;
    currentTier: number;
    children: React.ReactNode;
    label?: string;
}

export function TierLock({
    requiredTier,
    currentTier,
    children,
    label,
}: TierLockProps) {
    if (currentTier >= requiredTier) return <>{children}</>;

    return (
        <>
            <div className={styles.tierNudge}>
                <span className={styles.tierBadge}>Tier {requiredTier}</span>
                <span>
                    {label
                        ? `Unlock ${label}`
                        : `Upgrade to Tier ${requiredTier} to unlock`}
                </span>
            </div>
            <div className={styles.tierLockOverlay}>{children}</div>
        </>
    );
}
