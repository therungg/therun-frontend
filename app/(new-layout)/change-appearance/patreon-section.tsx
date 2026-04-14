'use client';

import axios from 'axios';
import Router from 'next/router';
import { useState } from 'react';
import { Button } from 'react-bootstrap';
import type { PatronPreferences, PerMode } from '../../../types/patreon.types';
import type { User } from '../../../types/session.types';
import styles from './customization/customization.module.scss';
import { PreviewPane } from './customization/preview-pane';
import { LoginWithPatreon } from './login-with-patreon';

export interface UserPatreonData {
    tier: 1 | 2 | 3;
    preferences: PatronPreferences;
}

interface PatreonSectionProps {
    userPatreonData: UserPatreonData;
    session: User;
}

const EMPTY_PREFERENCES: PatronPreferences = {
    hide: false,
    featureInScrollbar: true,
    featureOnOverview: true,
    showIcon: true,
    customColor: null,
    customGradient: null,
    bold: false,
    italic: false,
    textShadow: null,
    outline: null,
    gradientAngle: null,
    gradientAnimated: false,
};

export default function PatreonSection({
    userPatreonData,
    session,
    baseUrl,
}: PatreonSectionProps & { baseUrl: string }) {
    if (!userPatreonData.tier) {
        return <LoginWithPatreon session={session} baseUrl={baseUrl} />;
    }
    return (
        <PatreonSettings session={session} userPatreonData={userPatreonData} />
    );
}

function PatreonSettings({ userPatreonData, session }: PatreonSectionProps) {
    const initial: PatronPreferences = {
        ...EMPTY_PREFERENCES,
        ...userPatreonData.preferences,
    };
    const [prefs, setPrefs] = useState<PatronPreferences>(initial);
    const [saving, setSaving] = useState(false);

    const _update = <K extends keyof PatronPreferences>(
        key: K,
        value: PatronPreferences[K],
    ) => {
        setPrefs((p) => ({ ...p, [key]: value }));
    };

    const resetAll = () => {
        setPrefs({
            ...EMPTY_PREFERENCES,
            // keep display preferences as-is
            hide: prefs.hide,
            featureInScrollbar: prefs.featureInScrollbar,
            featureOnOverview: prefs.featureOnOverview,
            showIcon: prefs.showIcon,
            colorPreference: 0,
        });
    };

    const onSave = async () => {
        setSaving(true);
        try {
            const payload: PatronPreferences = {
                ...prefs,
                // Clear legacy after any save from the new UI.
                colorPreference: 0,
            };
            await axios.post(
                `/api/users/${session.id}-${session.username}/patreon-settings`,
                payload,
            );
            Router.reload();
        } finally {
            setSaving(false);
        }
    };

    // PerMode helper used by later tasks' subcomponents.
    void ({} as PerMode<string>);

    return (
        <div>
            <h1>Patreon Customization</h1>
            <p>Thank you for supporting! Customize how your name appears.</p>
            <div className={styles.layout}>
                <div className={styles.left}>
                    {/* Filled in by later tasks: preset-shortcuts, fill, font, effects, display */}
                </div>
                <div className={styles.right}>
                    <PreviewPane
                        username={session.username}
                        preferences={prefs}
                        tier={userPatreonData.tier}
                    />
                    <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={resetAll}
                    >
                        Reset to default
                    </Button>
                    <Button
                        variant="primary"
                        onClick={onSave}
                        disabled={saving}
                    >
                        {saving ? 'Saving…' : 'Save settings'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
