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
import {
    FormSection,
    InlineError,
    SectionFooter,
    SegmentedControl,
    SwitchField,
} from '../shared/form-kit';
import kit from '../shared/form-kit.module.scss';
import { getEmblemUploadUrlAction } from './actions/get-emblem-upload-url.action';
import { updateCategorySettingsAction } from './actions/update-category-settings.action';

const ALLOWED_EMBLEM_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_EMBLEM_SIZE = 2 * 1024 * 1024;

interface Props {
    gameSlug: string;
    gameId: number;
    category: ResolvedCategory | null;
}

interface State {
    sortAscending: boolean;
    showMilliseconds: boolean;
    imageUrl: string;
}

function readState(category: ResolvedCategory | null): State {
    if (!category) {
        return {
            sortAscending: true,
            showMilliseconds: true,
            imageUrl: '',
        };
    }
    return {
        sortAscending: category.sortAscending ?? true,
        showMilliseconds: category.showMilliseconds ?? true,
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
        state.imageUrl.trim() !== original.imageUrl.trim();
    const busy = isSaving || isUploading;

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setFormError(null);

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
        <FormSection
            title="Settings"
            lede={
                <>
                    Ranking direction, display precision, and the emblem shown
                    next to <strong>{category.display}</strong>.
                </>
            }
        >
            <form onSubmit={handleSubmit}>
                <SegmentedControl
                    label="Ranking direction"
                    value={state.sortAscending ? 'asc' : 'desc'}
                    options={[
                        { value: 'asc', label: 'Lower time = better' },
                        {
                            value: 'desc',
                            label: 'Higher value = better (score boards)',
                        },
                    ]}
                    disabled={busy}
                    onChange={(v) =>
                        setState((s) => ({
                            ...s,
                            sortAscending: v === 'asc',
                        }))
                    }
                />
                <SwitchField
                    id="showMs"
                    label="Show milliseconds"
                    checked={state.showMilliseconds}
                    disabled={busy}
                    onChange={(checked) =>
                        setState((s) => ({
                            ...s,
                            showMilliseconds: checked,
                        }))
                    }
                />

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

                <InlineError>{formError}</InlineError>
                <SectionFooter>
                    <button
                        type="submit"
                        className={kit.saveBtn}
                        disabled={busy || !dirty}
                    >
                        {isSaving ? 'Saving…' : 'Save settings'}
                    </button>
                    <button
                        type="button"
                        className={kit.resetBtn}
                        onClick={() => {
                            setState(original);
                            setFormError(null);
                        }}
                        disabled={busy || !dirty}
                    >
                        Reset
                    </button>
                </SectionFooter>
            </form>
        </FormSection>
    );
}
