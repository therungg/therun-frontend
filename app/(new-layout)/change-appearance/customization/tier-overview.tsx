import styles from './customization.module.scss';

const TIER_FEATURES = [
    {
        tier: 1,
        features: 'Solid colors · Presets · Display preferences',
    },
    {
        tier: 2,
        features: 'Gradients',
    },
    {
        tier: 3,
        features: 'Bold & italic · Gradient angle & animation',
    },
] as const;

export function TierOverview({ currentTier }: { currentTier: number }) {
    return (
        <div className={styles.tierOverview}>
            {TIER_FEATURES.map(({ tier, features }) => {
                const state =
                    currentTier > tier
                        ? 'past'
                        : currentTier === tier
                          ? 'current'
                          : 'locked';
                return (
                    <div
                        key={tier}
                        className={styles.tierOverviewRow}
                        data-state={state}
                    >
                        <span className={styles.tierOverviewBadge}>
                            Tier {tier}
                        </span>
                        <span className={styles.tierOverviewFeatures}>
                            {features}
                        </span>
                        {state === 'current' && (
                            <span className={styles.tierYoursBadge}>
                                Your tier
                            </span>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
