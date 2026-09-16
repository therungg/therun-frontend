'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    allowedPicks,
    rememberedPick,
    rememberPick,
} from '~app/(new-layout)/games-v2/[game]/theme/theme-memory';
import { applyThemeScheme } from '~app/(new-layout)/games-v2/[game]/theme/theme-scheme';
import {
    setCurrentPick,
    useCurrentPick,
    useThemeOptions,
} from '~src/components/theme-options-store';
import type { ThemePick } from '~src/lib/theme-settings';
import styles from './css/ThemeMenu.module.scss';

const DarkModeSlider = dynamic(() => import('./dark-mode-slider'), {
    ssr: false,
});

interface ThemeMenuItem {
    key: string;
    label: string;
    current: boolean;
    onSelect: () => void;
}

interface ThemeMenuProps {
    variant?: 'desktop' | 'mobile';
}

export function ThemeMenu({ variant = 'desktop' }: ThemeMenuProps) {
    const options = useThemeOptions();
    const pathname = usePathname();
    const { resolvedTheme, setTheme } = useTheme();
    // Shared across the desktop and mobile instances (theme-options-store) so
    // a pick made in one is reflected in the other's highlight.
    const pick = useCurrentPick();
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    useEffect(() => setMounted(true), []);

    // Reset whenever the published options change (a page mounted/unmounted)
    // or the route changes (two pages in a layout can publish identical
    // options, so options alone can miss a navigation). Never read the DOM
    // to decide this — the header's effects can run before the page's own.
    useEffect(() => {
        // A pick the visitor made for this runner or game holds across its tabs.
        const next = options
            ? (rememberedPick(
                  options.context,
                  allowedPicks(!!options.page, options.mine),
              ) ?? options.defaultPick)
            : 'none';
        setCurrentPick(next);
        if (options) {
            document.documentElement.dataset.themePick = next;
            applyThemeScheme(next);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [options, pathname]);

    // Close on click outside
    useEffect(() => {
        if (!open) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setOpen(false);
            triggerRef.current?.focus();
        }
    }, []);

    const selectDefault = useCallback(
        (mode: 'light' | 'dark') => {
            document.documentElement.dataset.themePick = 'none';
            // Set the mode directly too: a theme had forced dark, and setTheme
            // skips re-applying when the stored choice didn't change.
            document.documentElement.setAttribute('data-bs-theme', mode);
            document.documentElement.style.colorScheme = mode;
            setTheme(mode);
            setCurrentPick('none');
            if (options) rememberPick(options.context, 'none');
            setOpen(false);
        },
        [setTheme, options],
    );

    const selectPick = useCallback(
        (next: ThemePick) => {
            document.documentElement.dataset.themePick = next;
            applyThemeScheme(next);
            setCurrentPick(next);
            if (options) rememberPick(options.context, next);
            setOpen(false);
        },
        [options],
    );

    if (!mounted || !options || (!options.page && !options.mine)) {
        return <DarkModeSlider />;
    }

    const items: ThemeMenuItem[] = [
        {
            key: 'light',
            label: 'Default light',
            current: pick === 'none' && resolvedTheme === 'light',
            onSelect: () => selectDefault('light'),
        },
        {
            key: 'dark',
            label: 'Default dark',
            current: pick === 'none' && resolvedTheme === 'dark',
            onSelect: () => selectDefault('dark'),
        },
    ];
    if (options.page) {
        items.push({
            key: 'page',
            label: `${options.page.label}'s theme`,
            current: pick === 'page',
            onSelect: () => selectPick('page'),
        });
    }
    if (options.mine) {
        items.push({
            key: 'mine',
            label: 'My theme',
            current: pick === 'mine',
            onSelect: () => selectPick('mine'),
        });
    }

    if (variant === 'mobile') {
        return (
            <div className={styles.mobileList}>
                {items.map((item) => (
                    <button
                        key={item.key}
                        type="button"
                        role="menuitemradio"
                        aria-checked={item.current}
                        className={`${styles.mobileItem} ${item.current ? styles.mobileItemActive : ''}`}
                        onClick={item.onSelect}
                    >
                        {item.label}
                    </button>
                ))}
            </div>
        );
    }

    return (
        <div className={styles.container} ref={containerRef}>
            <button
                type="button"
                ref={triggerRef}
                className={styles.trigger}
                aria-expanded={open}
                aria-haspopup="true"
                onClick={() => setOpen((prev) => !prev)}
                onKeyDown={handleKeyDown}
            >
                Themes
            </button>
            <div
                className={`${styles.dropdown} ${open ? styles.dropdownOpen : ''}`}
                role="menu"
                onKeyDown={handleKeyDown}
            >
                {items.map((item) => (
                    <button
                        key={item.key}
                        type="button"
                        role="menuitemradio"
                        aria-checked={item.current}
                        className={`${styles.item} ${item.current ? styles.itemActive : ''}`}
                        onClick={item.onSelect}
                    >
                        {item.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default ThemeMenu;
