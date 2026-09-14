import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { getRunnerProfileHead } from '~src/lib/runner-profile';
import { safeDecodeURI } from '~src/utils/uri';
import { GameThemeStyle } from '../../games-v2/[game]/theme/game-theme-style';
import { ProfileSubnav } from './profile-subnav';
import { SectionHeader } from './section-header';
import styles from './sections.module.scss';

export default async function ProfileSectionsLayout({
    children,
    params,
}: {
    children: ReactNode;
    params: Promise<{ username: string }>;
}) {
    const { username } = await params;
    const head = await getRunnerProfileHead(safeDecodeURI(username));
    if (!head) notFound();
    return (
        <div className={styles.sectionPage}>
            <GameThemeStyle theme={head.mainGame?.theme ?? null} />
            <SectionHeader head={head} />
            <ProfileSubnav name={head.runner.name} guest={head.runner.guest} />
            {children}
        </div>
    );
}
