'use client';

import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import Link from '~src/components/link';
import styles from './TopbarLogo.module.scss';

export function TopbarLogo() {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const theme = mounted ? resolvedTheme || 'dark' : 'dark';

    return (
        <Link href="/" className={styles.logo}>
            <Image
                unoptimized
                alt="TheRun"
                src={`/logo_${theme}_theme_no_text_transparent.png`}
                height={36}
                width={36}
                className={styles.logoImage}
                suppressHydrationWarning
            />
            <span suppressHydrationWarning>therun.gg</span>
        </Link>
    );
}
