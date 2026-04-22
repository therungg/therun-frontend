'use client';

import type { ReactNode } from 'react';
import styles from './downloads.module.scss';

interface SectionHeaderProps {
    icon: ReactNode;
    kicker?: ReactNode;
    title: ReactNode;
    subtitle?: ReactNode;
    action?: ReactNode;
    tone?: 'default' | 'primary' | 'success' | 'accent';
}

export function SectionHeader({
    icon,
    kicker,
    title,
    subtitle,
    action,
    tone = 'default',
}: SectionHeaderProps) {
    const toneClass =
        tone === 'primary'
            ? styles.sectionHeaderPrimary
            : tone === 'success'
              ? styles.sectionHeaderSuccess
              : tone === 'accent'
                ? styles.sectionHeaderAccent
                : '';

    return (
        <header className={`${styles.sectionHeader} ${toneClass}`}>
            <div className={styles.sectionHeaderIcon} aria-hidden="true">
                {icon}
            </div>
            <div className={styles.sectionHeaderBody}>
                {kicker && (
                    <div className={styles.sectionHeaderKicker}>{kicker}</div>
                )}
                <h3 className={styles.sectionHeaderTitle}>{title}</h3>
                {subtitle && (
                    <p className={styles.sectionHeaderSubtitle}>{subtitle}</p>
                )}
            </div>
            {action && (
                <div className={styles.sectionHeaderAction}>{action}</div>
            )}
        </header>
    );
}
