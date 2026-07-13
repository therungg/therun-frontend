import React from 'react';
import { getSession } from '~src/actions/session.action';
import styles from '~src/components/fast50/deck/fast50.module.scss';
import { confirmPermission } from '~src/rbac/confirm-permission';
import { Picker } from './picker';

export const metadata = {
    title: 'fast50 — screen picker',
    robots: { index: false, follow: false },
};

export default async function ScreenPickerPage() {
    const user = await getSession();
    try {
        confirmPermission(user, 'moderate', 'admins');
    } catch {
        return (
            <main style={{ padding: '20vh 10vw', fontSize: 24 }}>
                Not authorized.
            </main>
        );
    }
    return (
        <main className={styles.picker}>
            <Picker />
        </main>
    );
}
