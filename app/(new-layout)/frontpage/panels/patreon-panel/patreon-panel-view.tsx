'use client';

import { FaPatreon } from 'react-icons/fa6';
import { Panel } from '~app/(new-layout)/components/panel.component';
import { PatreonName } from '~src/components/patreon/patreon-name';
import type { PatronPreferences } from '../../../../../types/patreon.types';
import styles from './patreon-panel.module.scss';

interface FeaturedPatron {
    name: string;
    tier: number;
    preferences: PatronPreferences;
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
        <Panel
            subtitle="No ads · No paywalls · No data selling"
            title="Support therun.gg"
            icon={FaPatreon}
            className="p-4"
            link={{ url: '/patreon', text: 'All supporters' }}
        >
            {featuredPatrons.length > 0 && (
                <div className={styles.showcase}>
                    <p className={styles.showcaseCaption}>Thank you to</p>
                    {featuredPatrons.map((patron) => (
                        <div key={patron.name} className={styles.showcaseName}>
                            <PatreonName
                                name={patron.name}
                                preferences={patron.preferences}
                                tier={patron.tier}
                                icon={patron.preferences.showIcon}
                                size={18}
                            />
                        </div>
                    ))}
                    <p className={styles.showcaseCaption}>
                        {totalPatronCount > featuredPatrons.length
                            ? `and ${totalPatronCount - featuredPatrons.length} other${totalPatronCount - featuredPatrons.length !== 1 ? ' supporters' : ' supporter'} for helping out.`
                            : 'for helping out.'}
                    </p>
                </div>
            )}

            <p className={styles.heading}>Keep therun.gg free for everyone</p>
            <p className={styles.description}>
                Supporters unlock cloud backups of every upload, unlimited
                LiveSplit layouts, custom name styling, and more — all while
                keeping the site free for the community.
            </p>

            <a
                href="/support"
                className={`btn btn-primary ${styles.ctaButton}`}
            >
                See what you unlock
            </a>

            {totalPatronCount > 0 && (
                <p className={styles.patronCount}>
                    Join {totalPatronCount} supporters
                </p>
            )}
        </Panel>
    );
};
