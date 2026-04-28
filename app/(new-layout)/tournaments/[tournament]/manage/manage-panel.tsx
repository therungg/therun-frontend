'use client';

import { useState } from 'react';
import { Nav, Tab } from 'react-bootstrap';
import {
    canManageAdmins,
    hasCapability,
} from '~src/lib/tournament-permissions';
import type { User } from '../../../../../types/session.types';
import type { Tournament } from '../../../../../types/tournament.types';
import { AdminsPanel } from './admins-panel';
import { LifecyclePanel } from './lifecycle-panel';
import { ParticipantsPanel } from './participants-panel';
import { SettingsPanel } from './settings-panel';
import { StaffPanel } from './staff-panel';

type ManageTab = 'settings' | 'staff' | 'admins' | 'participants' | 'lifecycle';

export function ManagePanel({
    tournament,
    user,
}: {
    tournament: Tournament;
    user: User;
}) {
    const tabs: { key: ManageTab; label: string; visible: boolean }[] = [
        {
            key: 'settings',
            label: 'Settings',
            visible: hasCapability(user, tournament, 'edit_settings'),
        },
        {
            key: 'staff',
            label: 'Staff',
            visible: hasCapability(user, tournament, 'manage_staff'),
        },
        { key: 'admins', label: 'Admins', visible: canManageAdmins(user) },
        {
            key: 'participants',
            label: 'Participants',
            visible: hasCapability(user, tournament, 'manage_participants'),
        },
        {
            key: 'lifecycle',
            label: 'Lifecycle',
            visible: hasCapability(user, tournament, 'lifecycle'),
        },
    ];
    const visibleTabs = tabs.filter((t) => t.visible);

    const [active, setActive] = useState<ManageTab>(
        visibleTabs[0]?.key ?? 'settings',
    );

    return (
        <Tab.Container
            activeKey={active}
            onSelect={(k) => k && setActive(k as ManageTab)}
        >
            <Nav variant="tabs" className="mb-3">
                {visibleTabs.map((t) => (
                    <Nav.Item key={t.key}>
                        <Nav.Link eventKey={t.key}>{t.label}</Nav.Link>
                    </Nav.Item>
                ))}
            </Nav>
            <Tab.Content>
                <Tab.Pane eventKey="settings">
                    <SettingsPanel tournament={tournament} user={user} />
                </Tab.Pane>
                <Tab.Pane eventKey="staff">
                    <StaffPanel tournament={tournament} />
                </Tab.Pane>
                <Tab.Pane eventKey="admins">
                    <AdminsPanel tournament={tournament} />
                </Tab.Pane>
                <Tab.Pane eventKey="participants">
                    <ParticipantsPanel tournament={tournament} />
                </Tab.Pane>
                <Tab.Pane eventKey="lifecycle">
                    <LifecyclePanel tournament={tournament} />
                </Tab.Pane>
            </Tab.Content>
        </Tab.Container>
    );
}
