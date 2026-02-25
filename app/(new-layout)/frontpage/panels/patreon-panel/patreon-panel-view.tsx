'use client';

import { Panel } from '~app/(new-layout)/components/panel.component';
import { PatreonName } from '~src/components/patreon/patreon-name';
import { BunnyIcon } from '~src/icons/bunny-icon';
import styles from './patreon-panel.module.scss';

interface FeaturedPatron {
    name: string;
    tier: number;
    colorPreference: number;
    showIcon: boolean;
}

interface PatreonPanelViewProps {
    featuredPatrons: FeaturedPatron[];
    totalPatronCount: number;
}

export const PatreonPanelView: React.FC<PatreonPanelViewProps> = ({
    featuredPatrons,
    totalPatronCount,
}) => {
    return (
        <Panel subtitle="Support" title="Patreon" className="p-4">
            <div className={styles.ctaContainer}>
                <div className={styles.iconWrapper}>
                    <BunnyIcon size={32} />
                </div>

                <h5 className={styles.heading}>
                    therun.gg is ad-free, thanks to our patrons
                </h5>

                <p className={styles.description}>
                    {totalPatronCount > 0
                        ? `Join ${totalPatronCount} patrons keeping therun.gg free for everyone.`
                        : 'Help keep the site ad-free and unlock perks!'}
                </p>

                <a
                    href="/patreon"
                    className={`btn btn-primary ${styles.ctaButton}`}
                >
                    Become a Patron
                </a>

                {featuredPatrons.length > 0 && (
                    <div className={styles.patronSection}>
                        <p className={styles.patronLabel}>
                            Thanks to our patrons:
                        </p>
                        <div className={styles.patronList}>
                            {featuredPatrons.map((patron) => (
                                <div
                                    key={patron.name}
                                    className={styles.patronItem}
                                >
                                    <PatreonName
                                        name={patron.name}
                                        color={patron.colorPreference}
                                        icon={patron.showIcon}
                                        size={14}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Panel>
    );
};
