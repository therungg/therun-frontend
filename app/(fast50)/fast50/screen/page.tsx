import React from 'react';
import styles from '~src/components/fast50/deck/fast50.module.scss';
import { Picker } from './picker';

export const metadata = {
    title: 'fast50 — screen picker',
    robots: { index: false, follow: false },
};

export default function ScreenPickerPage() {
    return (
        <main className={styles.picker}>
            <Picker />
        </main>
    );
}
