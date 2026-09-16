import type { ReactNode } from 'react';
import type { RunnerProfileHead } from '../../../../types/runner-profile.types';
import { PageTheme } from '../../games-v2/[game]/theme/page-theme';
import { profileThemeOf } from '../../games-v2/[game]/theme/theme-pick';
import { ProfileSubnav } from './profile-subnav';
import { SectionHeader } from './section-header';
import styles from './sections.module.scss';

/** The runner's theme, header and section tabs around any profile page. */
export function ProfileShell({
    head,
    children,
}: {
    head: RunnerProfileHead;
    children: ReactNode;
}) {
    return (
        <div className={styles.sectionPage}>
            <PageTheme
                kind="profile"
                label={head.runner.name}
                theme={profileThemeOf(head)}
            />
            <SectionHeader head={head} />
            <ProfileSubnav name={head.runner.name} guest={head.runner.guest} />
            {children}
        </div>
    );
}
