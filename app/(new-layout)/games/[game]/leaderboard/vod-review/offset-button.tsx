'use client';

import { useEffect, useRef, useState } from 'react';
import { PopoverLayer } from '../../shared/popover-layer';
import { formatOffsetMs, parseOffsetMs } from './retime';
import styles from './vod-review.module.scss';

/**
 * A fixed amount taken off the measured time — 1.4 s of lead-in the rules
 * don't count, or -36 to add 36 s back. Typed as seconds or a clock.
 */
export function OffsetButton({
    offsetMs,
    onChange,
    disabled,
}: {
    offsetMs: number;
    onChange: (ms: number) => void;
    disabled: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [text, setText] = useState('');
    const anchorRef = useRef<HTMLButtonElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    // PopoverLayer keeps the panel `visibility: hidden` until it has placed
    // it, and a hidden input cannot take focus, so try each frame until it
    // does. Left in the workbench, the keys typed here would drive the player.
    useEffect(() => {
        if (!open) return;
        let id = 0;
        let tries = 0;
        const attempt = () => {
            const el = inputRef.current;
            el?.focus();
            if (document.activeElement !== el && ++tries < 30)
                id = window.requestAnimationFrame(attempt);
        };
        id = window.requestAnimationFrame(attempt);
        return () => window.cancelAnimationFrame(id);
    }, [open]);
    const parsed = parseOffsetMs(text);
    const invalid = text.trim() !== '' && parsed === null;

    const close = () => {
        setOpen(false);
        anchorRef.current?.focus();
    };
    const apply = () => {
        if (parsed === null) return;
        onChange(parsed);
        close();
    };

    return (
        <>
            <button
                ref={anchorRef}
                type="button"
                className={`${styles.quiet} ${offsetMs !== 0 ? styles.offsetSet : ''}`}
                disabled={disabled}
                aria-expanded={open}
                onClick={() => {
                    setText(
                        offsetMs !== 0
                            ? formatOffsetMs(offsetMs).replace('−', '-')
                            : '',
                    );
                    setOpen((o) => !o);
                }}
            >
                {offsetMs !== 0
                    ? `Offset ${formatOffsetMs(offsetMs)} s`
                    : 'Set offset'}
            </button>
            <PopoverLayer
                open={open}
                anchorRef={anchorRef}
                onClose={() => setOpen(false)}
                align="end"
                side="top"
                themed
            >
                <form
                    className={styles.offsetPop}
                    onSubmit={(e) => {
                        e.preventDefault();
                        apply();
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                            e.stopPropagation();
                            close();
                        }
                    }}
                >
                    <label
                        htmlFor="retime-offset"
                        className={styles.settingsLabel}
                    >
                        Offset
                    </label>
                    <input
                        ref={inputRef}
                        id="retime-offset"
                        className={styles.markerText}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="1.4 or -36"
                        inputMode="decimal"
                        autoComplete="off"
                    />
                    <p className={styles.settingsNote}>
                        {invalid
                            ? 'Seconds (1.4, -36) or a clock (-0:36.5).'
                            : 'Subtracted from the time between start and end. Negative adds.'}
                    </p>
                    <div className={styles.offsetActions}>
                        {offsetMs !== 0 && (
                            <button
                                type="button"
                                className={styles.pinPopRemove}
                                onClick={() => {
                                    onChange(0);
                                    close();
                                }}
                            >
                                Remove offset
                            </button>
                        )}
                        <span className={styles.grow} />
                        <button type="submit" className={styles.cardTool}>
                            Set
                        </button>
                    </div>
                </form>
            </PopoverLayer>
        </>
    );
}
