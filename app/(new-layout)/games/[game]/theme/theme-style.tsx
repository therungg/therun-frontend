'use client';

import { useLayoutEffect, useRef } from 'react';

/**
 * A theme stylesheet that switches off while its page is hidden. With
 * cacheComponents a previous route stays mounted inside a hidden Activity, and
 * a plain <style> would keep applying there, beating the visible page's theme
 * by document order. Effects tear down on hide and re-run on show, so the
 * cleanup disables the sheet and the effect re-enables it. Server HTML carries
 * no media attribute, so the first load applies it immediately.
 */
export function ThemeStyle({ css }: { css: string }) {
    const ref = useRef<HTMLStyleElement>(null);
    useLayoutEffect(() => {
        const style = ref.current;
        if (!style) return;
        style.media = '';
        return () => {
            style.media = 'not all';
        };
    }, []);
    return (
        <style
            ref={ref}
            // Safe by construction: the css comes from buildThemeCss, which
            // interpolates only validated colors.
            dangerouslySetInnerHTML={{ __html: css }}
        />
    );
}
