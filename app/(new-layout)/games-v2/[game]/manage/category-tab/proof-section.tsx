'use client';

import { type FormEvent, useEffect, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type { ResolvedCategory } from '../../../../../../types/leaderboards.types';
import { updateCategorySettingsAction } from './actions/update-category-settings.action';

interface Props {
    gameSlug: string;
    gameId: number;
    category: ResolvedCategory | null;
}

type VideoPolicy = 'none' | 'top-n' | 'all';

interface State {
    videoPolicy: VideoPolicy;
    topN: string;
}

function readState(category: ResolvedCategory | null): State {
    if (!category) return { videoPolicy: 'none', topN: '' };
    const requireVideo = category.requireVideo ?? false;
    const topNValue = category.requireVideoTopN;
    let videoPolicy: VideoPolicy;
    if (!requireVideo) videoPolicy = 'none';
    else if (topNValue != null) videoPolicy = 'top-n';
    else videoPolicy = 'all';
    return {
        videoPolicy,
        topN: topNValue != null ? String(topNValue) : '',
    };
}

/**
 * Proof & review — the wizard's own name for this (step-defaults.tsx:335).
 *
 * It used to be two fields inside the catch-all "Category Settings" pane,
 * which is why a mod who set it during setup could never find it again. It
 * writes requireVideo + requireVideoTopN and nothing else: they are one
 * concept and one control, so a partial write would be meaningless.
 */
export function ProofSection({ gameSlug, gameId, category }: Props) {
    const [state, setState] = useState<State>(() => readState(category));
    const [original, setOriginal] = useState<State>(() => readState(category));
    const [busy, startTransition] = useTransition();

    useEffect(() => {
        const next = readState(category);
        setState(next);
        setOriginal(next);
    }, [category]);

    const dirty =
        state.videoPolicy !== original.videoPolicy ||
        (state.videoPolicy === 'top-n' && state.topN !== original.topN);

    function save(e: FormEvent) {
        e.preventDefault();
        if (!category || !dirty) return;

        let requireVideo: boolean;
        let requireVideoTopN: number | null;
        if (state.videoPolicy === 'none') {
            requireVideo = false;
            requireVideoTopN = null;
        } else if (state.videoPolicy === 'all') {
            requireVideo = true;
            requireVideoTopN = null;
        } else {
            const parsed = Number.parseInt(state.topN, 10);
            if (!Number.isInteger(parsed) || parsed < 1) {
                toast.error('Top-N must be a whole number of 1 or more.');
                return;
            }
            requireVideo = true;
            requireVideoTopN = parsed;
        }

        startTransition(async () => {
            const res = await updateCategorySettingsAction({
                gameSlug,
                gameId,
                categoryId: category.id,
                requireVideo,
                requireVideoTopN,
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            setOriginal(state);
            toast.success('Proof requirement saved.');
        });
    }

    if (!category) return null;

    return (
        <section>
            <h2 className="h5 mb-1">Proof &amp; review</h2>
            <p className="text-muted small mb-3">
                Whether a run needs a video to stand. Runs missing required
                proof are held for a moderator instead of going straight to the
                board.
            </p>

            <form onSubmit={save}>
                <div className="form-check">
                    <input
                        type="radio"
                        className="form-check-input"
                        id="proofNone"
                        checked={state.videoPolicy === 'none'}
                        onChange={() =>
                            setState((s) => ({ ...s, videoPolicy: 'none' }))
                        }
                        disabled={busy}
                    />
                    <label
                        htmlFor="proofNone"
                        className="form-check-label small"
                    >
                        No video required
                    </label>
                </div>

                <div className="form-check d-flex align-items-center gap-2">
                    <input
                        type="radio"
                        className="form-check-input"
                        id="proofTopN"
                        checked={state.videoPolicy === 'top-n'}
                        onChange={() =>
                            setState((s) => ({ ...s, videoPolicy: 'top-n' }))
                        }
                        disabled={busy}
                    />
                    <label
                        htmlFor="proofTopN"
                        className="form-check-label small mb-0"
                    >
                        Require video for top
                    </label>
                    <input
                        type="number"
                        min={1}
                        step={1}
                        className="form-control form-control-sm"
                        style={{ width: '5rem' }}
                        value={state.topN}
                        onChange={(e) =>
                            setState((s) => ({ ...s, topN: e.target.value }))
                        }
                        disabled={busy || state.videoPolicy !== 'top-n'}
                        aria-label="Number of top runs that require video"
                    />
                    <span className="form-check-label small mb-0">runs</span>
                </div>

                <div className="form-check">
                    <input
                        type="radio"
                        className="form-check-input"
                        id="proofAll"
                        checked={state.videoPolicy === 'all'}
                        onChange={() =>
                            setState((s) => ({ ...s, videoPolicy: 'all' }))
                        }
                        disabled={busy}
                    />
                    <label
                        htmlFor="proofAll"
                        className="form-check-label small"
                    >
                        Require video for every run
                    </label>
                </div>

                <button
                    type="submit"
                    className="btn btn-sm btn-primary mt-3"
                    disabled={busy || !dirty}
                >
                    {busy ? 'Saving…' : 'Save proof requirement'}
                </button>
            </form>
        </section>
    );
}
