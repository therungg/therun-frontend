'use client';

import {
    type ChangeEvent,
    type FormEvent,
    useEffect,
    useState,
    useTransition,
} from 'react';
import { toast } from 'react-toastify';
import type { ResolvedCategory } from '../../../../../../types/leaderboards.types';
import { getEmblemUploadUrlAction } from './actions/get-emblem-upload-url.action';
import { updateCategorySettingsAction } from './actions/update-category-settings.action';

const ALLOWED_EMBLEM_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_EMBLEM_SIZE = 2 * 1024 * 1024;

interface Props {
    gameSlug: string;
    gameId: number;
    category: ResolvedCategory | null;
}

type VideoPolicy = 'none' | 'top-n' | 'all';

interface State {
    sortAscending: boolean;
    showMilliseconds: boolean;
    videoPolicy: VideoPolicy;
    topN: string;
    imageUrl: string;
}

function readState(category: ResolvedCategory | null): State {
    if (!category) {
        return {
            sortAscending: true,
            showMilliseconds: true,
            videoPolicy: 'none',
            topN: '',
            imageUrl: '',
        };
    }
    const requireVideo = category.requireVideo ?? false;
    const topNValue = category.requireVideoTopN;
    let videoPolicy: VideoPolicy;
    if (!requireVideo) videoPolicy = 'none';
    else if (topNValue != null) videoPolicy = 'top-n';
    else videoPolicy = 'all';
    return {
        sortAscending: category.sortAscending ?? true,
        showMilliseconds: category.showMilliseconds ?? true,
        videoPolicy,
        topN: topNValue != null ? String(topNValue) : '',
        imageUrl: category?.imageUrl ?? '',
    };
}

export function CategorySettingsSection({ gameSlug, gameId, category }: Props) {
    const [state, setState] = useState<State>(() => readState(category));
    const [original, setOriginal] = useState<State>(() => readState(category));
    const [formError, setFormError] = useState<string | null>(null);
    const [isSaving, startSave] = useTransition();
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        const next = readState(category);
        setState(next);
        setOriginal(next);
        setFormError(null);
    }, [
        category?.id,
        category?.sortAscending,
        category?.showMilliseconds,
        category?.requireVideo,
        category?.requireVideoTopN,
        category?.imageUrl,
    ]);

    if (!category) return null;

    const handleEmblemChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.currentTarget.files?.[0];
        e.currentTarget.value = '';
        if (!file) return;

        setFormError(null);

        if (!ALLOWED_EMBLEM_TYPES.includes(file.type)) {
            setFormError('Image must be PNG, JPEG, or WEBP.');
            return;
        }
        if (file.size > MAX_EMBLEM_SIZE) {
            setFormError('Image must be 2 MB or smaller.');
            return;
        }

        setIsUploading(true);
        try {
            const res = await getEmblemUploadUrlAction({
                gameSlug,
                gameId,
                categoryId: category.id,
                contentType: file.type,
                contentLength: file.size,
            });
            if ('error' in res) {
                setFormError(res.error);
                return;
            }

            const putRes = await fetch(res.result.uploadUrl, {
                method: 'PUT',
                body: file,
                headers: { 'Content-Type': file.type },
            });
            if (!putRes.ok) {
                setFormError(`Upload failed (${putRes.status}).`);
                return;
            }

            setState((s) => ({ ...s, imageUrl: res.result.imageUrl }));
        } catch {
            setFormError('Upload failed.');
        } finally {
            setIsUploading(false);
        }
    };

    const dirty =
        state.sortAscending !== original.sortAscending ||
        state.showMilliseconds !== original.showMilliseconds ||
        state.videoPolicy !== original.videoPolicy ||
        (state.videoPolicy === 'top-n' && state.topN !== original.topN) ||
        state.imageUrl.trim() !== original.imageUrl.trim();
    const busy = isSaving || isUploading;

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setFormError(null);

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
                setFormError(
                    'Enter a positive integer for "Require video for top N".',
                );
                return;
            }
            requireVideo = true;
            requireVideoTopN = parsed;
        }

        startSave(async () => {
            const res = await updateCategorySettingsAction({
                gameSlug,
                gameId,
                categoryId: category.id,
                sortAscending:
                    state.sortAscending !== original.sortAscending
                        ? state.sortAscending
                        : undefined,
                showMilliseconds:
                    state.showMilliseconds !== original.showMilliseconds
                        ? state.showMilliseconds
                        : undefined,
                requireVideo:
                    state.videoPolicy !== original.videoPolicy
                        ? requireVideo
                        : undefined,
                requireVideoTopN:
                    state.videoPolicy !== original.videoPolicy ||
                    state.topN !== original.topN
                        ? requireVideoTopN
                        : undefined,
                imageUrl:
                    state.imageUrl.trim() !== original.imageUrl.trim()
                        ? state.imageUrl.trim() || null
                        : undefined,
            });
            if ('error' in res) {
                setFormError(res.error);
                return;
            }
            toast.success('Category settings saved');
            setOriginal(state);
        });
    };

    return (
        <section className="border rounded p-3 mb-4">
            <h2 className="h5 mb-1">Category Settings</h2>
            <p className="text-muted small mb-3">
                Ranking direction, display precision, and video requirement for{' '}
                <strong>{category.display}</strong>.
            </p>

            <form onSubmit={handleSubmit}>
                <div className="row g-3 mb-3">
                    <div className="col-md-6">
                        <label className="form-label small">
                            Ranking direction
                        </label>
                        <div className="form-check">
                            <input
                                type="radio"
                                className="form-check-input"
                                id="sortAsc"
                                checked={state.sortAscending}
                                onChange={() =>
                                    setState((s) => ({
                                        ...s,
                                        sortAscending: true,
                                    }))
                                }
                                disabled={busy}
                            />
                            <label
                                htmlFor="sortAsc"
                                className="form-check-label small"
                            >
                                Lower time = better (default)
                            </label>
                        </div>
                        <div className="form-check">
                            <input
                                type="radio"
                                className="form-check-input"
                                id="sortDesc"
                                checked={!state.sortAscending}
                                onChange={() =>
                                    setState((s) => ({
                                        ...s,
                                        sortAscending: false,
                                    }))
                                }
                                disabled={busy}
                            />
                            <label
                                htmlFor="sortDesc"
                                className="form-check-label small"
                            >
                                Higher value = better
                            </label>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <label className="form-label small">Display</label>
                        <div className="form-check">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                id="showMs"
                                checked={state.showMilliseconds}
                                onChange={(e) =>
                                    setState((s) => ({
                                        ...s,
                                        showMilliseconds: e.target.checked,
                                    }))
                                }
                                disabled={busy}
                            />
                            <label
                                htmlFor="showMs"
                                className="form-check-label small"
                            >
                                Show milliseconds
                            </label>
                        </div>
                    </div>
                </div>

                <div className="mb-3">
                    <label
                        className="form-label small"
                        htmlFor="catImageUpload"
                    >
                        Emblem image
                    </label>
                    {state.imageUrl && (
                        <div className="d-flex align-items-center gap-2 mb-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={state.imageUrl}
                                alt=""
                                width={36}
                                height={36}
                                className="rounded"
                                style={{ objectFit: 'cover' }}
                            />
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() =>
                                    setState((s) => ({ ...s, imageUrl: '' }))
                                }
                                disabled={busy || isUploading}
                            >
                                Remove
                            </button>
                        </div>
                    )}
                    <input
                        type="file"
                        id="catImageUpload"
                        accept="image/png,image/jpeg,image/webp"
                        className="form-control form-control-sm"
                        onChange={handleEmblemChange}
                        disabled={busy || isUploading}
                    />
                    {isUploading && (
                        <div className="form-text small">Uploading…</div>
                    )}
                    <div className="form-text small">
                        PNG/JPEG/WebP, max 2 MB. Square, iconic art — renders at
                        36px. A boss face or item beats a screenshot.
                    </div>
                </div>

                <div className="mb-3">
                    <label className="form-label small">
                        Video requirement
                    </label>
                    <div className="form-check">
                        <input
                            type="radio"
                            className="form-check-input"
                            id="vidNone"
                            checked={state.videoPolicy === 'none'}
                            onChange={() =>
                                setState((s) => ({
                                    ...s,
                                    videoPolicy: 'none',
                                }))
                            }
                            disabled={busy}
                        />
                        <label
                            htmlFor="vidNone"
                            className="form-check-label small"
                        >
                            No video required
                        </label>
                    </div>
                    <div className="form-check d-flex align-items-center gap-2">
                        <input
                            type="radio"
                            className="form-check-input"
                            id="vidTopN"
                            checked={state.videoPolicy === 'top-n'}
                            onChange={() =>
                                setState((s) => ({
                                    ...s,
                                    videoPolicy: 'top-n',
                                }))
                            }
                            disabled={busy}
                        />
                        <label
                            htmlFor="vidTopN"
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
                                setState((s) => ({
                                    ...s,
                                    topN: e.target.value,
                                }))
                            }
                            disabled={busy || state.videoPolicy !== 'top-n'}
                        />
                        <span className="form-check-label small mb-0">
                            runs
                        </span>
                    </div>
                    <div className="form-check">
                        <input
                            type="radio"
                            className="form-check-input"
                            id="vidAll"
                            checked={state.videoPolicy === 'all'}
                            onChange={() =>
                                setState((s) => ({ ...s, videoPolicy: 'all' }))
                            }
                            disabled={busy}
                        />
                        <label
                            htmlFor="vidAll"
                            className="form-check-label small"
                        >
                            Require video for all runs
                        </label>
                    </div>
                </div>

                <div className="d-flex gap-2">
                    <button
                        type="submit"
                        className="btn btn-sm btn-primary"
                        disabled={busy || !dirty}
                    >
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => {
                            setState(original);
                            setFormError(null);
                        }}
                        disabled={busy || !dirty}
                    >
                        Reset
                    </button>
                </div>

                {formError && (
                    <div className="alert alert-danger mt-2 mb-0 py-2">
                        {formError}
                    </div>
                )}
            </form>
        </section>
    );
}
