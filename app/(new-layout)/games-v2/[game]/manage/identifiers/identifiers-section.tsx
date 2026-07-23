'use client';

import { FormEvent, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { updateIdentifiersAction } from './actions/update-identifiers.action';

interface Props {
    gameSlug: string;
    gameId: number;
    initialSlug: string | null;
}

const SLUG_MAX = 64;

function normalize(s: string): string {
    return s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export function IdentifiersSection({ gameSlug, gameId, initialSlug }: Props) {
    const [slug, setSlug] = useState(initialSlug ?? '');
    const [originalSlug, setOriginalSlug] = useState(initialSlug ?? '');
    const [error, setError] = useState<string | null>(null);
    const [isSaving, startSave] = useTransition();

    const dirty = slug !== originalSlug;

    const slugPreview = normalize(slug);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        if (slug.trim() !== '' && slugPreview === '') {
            setError('Slug must contain at least one alphanumeric character.');
            return;
        }
        if (slugPreview.length > SLUG_MAX) {
            setError(`Slug must be ${SLUG_MAX} characters or fewer.`);
            return;
        }

        startSave(async () => {
            const res = await updateIdentifiersAction({
                gameSlug,
                gameId,
                slug: dirty ? (slug.trim() === '' ? null : slug) : undefined,
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            toast.success('URL slug saved');
            const newSlug = slug.trim() === '' ? '' : slugPreview;
            setSlug(newSlug);
            setOriginalSlug(newSlug);
        });
    };

    const handleReset = () => {
        setSlug(originalSlug);
        setError(null);
    };

    return (
        <section className="border rounded p-3 mb-4">
            <h2 className="h5 mb-1">URL slug</h2>
            <p className="text-muted small mb-3">
                URL slug used to look up this game. Values are normalized to
                lowercase with non-alphanumerics replaced by dashes. Must be
                unique across all games. Clear the field to remove it.
            </p>

            <form onSubmit={handleSubmit}>
                <div className="row g-3">
                    <div className="col-md-6">
                        <label htmlFor="game-slug" className="form-label small">
                            Slug
                        </label>
                        <input
                            id="game-slug"
                            type="text"
                            className="form-control form-control-sm"
                            value={slug}
                            onChange={(e) => setSlug(e.target.value)}
                            disabled={isSaving}
                            placeholder="e.g. super-mario-64"
                        />
                        <small className="text-muted">
                            {slug.trim() === '' ? (
                                <>
                                    No slug set — falls back to the auto-derived
                                    name.
                                </>
                            ) : slugPreview !== slug ? (
                                <>
                                    Will be stored as <code>{slugPreview}</code>
                                </>
                            ) : (
                                <>
                                    {slugPreview.length}/{SLUG_MAX} characters.
                                </>
                            )}
                        </small>
                    </div>
                </div>
                <div className="d-flex gap-2 mt-3">
                    <button
                        type="submit"
                        className="btn btn-sm btn-primary"
                        disabled={isSaving || !dirty}
                    >
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={handleReset}
                        disabled={isSaving || !dirty}
                    >
                        Reset
                    </button>
                </div>
                {error && (
                    <div className="alert alert-danger mt-2 mb-0 py-2">
                        {error}
                    </div>
                )}
            </form>
        </section>
    );
}
