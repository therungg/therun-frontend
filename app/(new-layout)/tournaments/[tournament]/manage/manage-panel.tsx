'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
    canManageAdmins,
    hasCapability,
} from '~src/lib/tournament-permissions';
import { safeEncodeURI } from '~src/utils/uri';
import type { User } from '../../../../../types/session.types';
import type { Tournament } from '../../../../../types/tournament.types';
import { formStyles as styles } from '../../components/form-primitives';
import { AdminsPanel } from './admins-panel';
import { LifecyclePanel } from './lifecycle-panel';
import managerStyles from './manage-panel.module.scss';
import { ParticipantsPanel } from './participants-panel';
import { StaffPanel } from './staff-panel';

type ManageTab = 'lifecycle' | 'staff' | 'admins' | 'participants';

export function ManagePanel({
    tournament,
    user,
}: {
    tournament: Tournament;
    user: User;
}) {
    const tournamentHref = `/tournaments/${safeEncodeURI(tournament.name)}`;
    const tabs: { key: ManageTab; label: string; visible: boolean }[] = [
        {
            key: 'lifecycle',
            label: 'Lifecycle',
            visible: hasCapability(user, tournament, 'lifecycle'),
        },
        {
            key: 'participants',
            label: 'Participants',
            visible: hasCapability(user, tournament, 'manage_participants'),
        },
        {
            key: 'staff',
            label: 'Staff',
            visible: hasCapability(user, tournament, 'manage_staff'),
        },
        { key: 'admins', label: 'Admins', visible: canManageAdmins(user) },
    ];
    const visibleTabs = tabs.filter((t) => t.visible);

    const [active, setActive] = useState<ManageTab>(
        visibleTabs[0]?.key ?? 'lifecycle',
    );
    const canEdit = hasCapability(user, tournament, 'edit_settings');

    const displayName = tournament.shortName || tournament.name;

    return (
        <div className={styles.formRoot}>
            <Link href={tournamentHref} className={styles.breadcrumb}>
                <span className={styles.breadcrumbArrow}>←</span>
                Back to {displayName}
            </Link>

            <div className={styles.hero}>
                <span className={styles.heroEyebrow}>● Managing</span>
                <h1 className={styles.heroTitle}>{displayName}</h1>
                <p className={styles.heroSubtitle}>
                    Run lifecycle, staff, and participants here. To edit info
                    such as schedule, eligible runs, description, and branding,
                    use the{' '}
                    {canEdit ? (
                        <Link
                            href={`${tournamentHref}/edit`}
                            style={{
                                color: 'inherit',
                                textDecoration: 'underline',
                            }}
                        >
                            Edit page
                        </Link>
                    ) : (
                        'Edit page'
                    )}
                    .
                </p>
            </div>

            {canEdit && (
                <div className={managerStyles.editRow}>
                    <Link
                        href={`${tournamentHref}/edit`}
                        className={styles.primaryButton}
                    >
                        Edit tournament info →
                    </Link>
                </div>
            )}

            <nav className={managerStyles.tabBar}>
                {visibleTabs.map((t) => (
                    <button
                        key={t.key}
                        type="button"
                        className={
                            active === t.key
                                ? `${managerStyles.tab} ${managerStyles.tabActive}`
                                : managerStyles.tab
                        }
                        onClick={() => setActive(t.key)}
                    >
                        {t.label}
                    </button>
                ))}
            </nav>

            <div>
                {active === 'lifecycle' && (
                    <LifecyclePanel tournament={tournament} />
                )}
                {active === 'staff' && <StaffPanel tournament={tournament} />}
                {active === 'admins' && <AdminsPanel tournament={tournament} />}
                {active === 'participants' && (
                    <ParticipantsPanel tournament={tournament} />
                )}
            </div>
        </div>
    );
}
