'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function TopbarLogo() {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const theme = mounted ? resolvedTheme || 'dark' : 'dark';

    return (
        <Link
            href="/"
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                textDecoration: 'none',
                color: 'var(--bs-body-color)',
                fontWeight: 600,
                fontSize: '1rem',
                whiteSpace: 'nowrap',
            }}
        >
            <Image
                unoptimized
                alt="TheRun"
                src={`/logo_${theme}_theme_no_text_transparent.png`}
                height={36}
                width={36}
                suppressHydrationWarning
            />
            <span suppressHydrationWarning>The Run</span>
        </Link>
    );
}
