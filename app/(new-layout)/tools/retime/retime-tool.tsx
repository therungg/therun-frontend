'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { detectVod } from '~app/(new-layout)/games/[game]/leaderboard/vod-review/player/types';
import { VodReviewWorkbench } from '~app/(new-layout)/games/[game]/leaderboard/vod-review/vod-review-workbench';
import styles from '../tools.module.scss';

const DEFAULT_FPS = 60;

export function RetimeTool() {
    const router = useRouter();
    const pathname = usePathname();
    const url = useSearchParams().get('url') ?? '';
    const [input, setInput] = useState(url);
    const [invalid, setInvalid] = useState(false);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const next = input.trim();
        if (!detectVod(next)) {
            setInvalid(true);
            return;
        }
        setInvalid(false);
        router.replace(`${pathname}?url=${encodeURIComponent(next)}`, {
            scroll: false,
        });
    };

    const vod = url && detectVod(url) ? url : null;

    return (
        <>
            <form className={styles.form} onSubmit={submit}>
                <label className={styles.field}>
                    <span className={styles.label}>VOD link</span>
                    <input
                        type="url"
                        className="form-control"
                        placeholder="https://www.twitch.tv/videos/… or https://youtu.be/…"
                        value={input}
                        onChange={(e) => {
                            setInput(e.target.value);
                            setInvalid(false);
                        }}
                    />
                </label>
                <button type="submit" className="btn btn-primary">
                    Load
                </button>
                {invalid && (
                    <p className={`${styles.error} ${styles.wideField} mb-0`}>
                        Only Twitch and YouTube VODs are supported.
                    </p>
                )}
            </form>

            {vod && (
                <VodReviewWorkbench
                    key={vod}
                    mode="runner"
                    url={vod}
                    initial={{
                        fps: DEFAULT_FPS,
                        markers: [],
                        realTimeMs: null,
                        timing: 'realtime',
                    }}
                    autoFocus
                />
            )}
        </>
    );
}
