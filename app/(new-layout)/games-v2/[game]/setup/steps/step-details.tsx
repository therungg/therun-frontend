'use client';

import { useState, useTransition } from 'react';
import { updateIdentifiersAction } from '../../manage/identifiers/actions/update-identifiers.action';
import { updateGameMetadataAction } from '../actions/update-game-metadata.action';
import type { StepProps } from '../types';

export function StepDetails({ data, onAdvance }: StepProps) {
    const [slug, setSlug] = useState(data.identifiers.slug ?? '');
    const [abbreviation, setAbbreviation] = useState(
        data.identifiers.abbreviation ?? '',
    );
    const [coverUrl, setCoverUrl] = useState(data.metadata.coverUrl ?? '');
    const [platformsText, setPlatformsText] = useState(
        data.metadata.platforms.join(', '),
    );
    const [releaseYear, setReleaseYear] = useState(
        data.metadata.releaseYear?.toString() ?? '',
    );
    const [discordUrl, setDiscordUrl] = useState(
        data.metadata.discordUrl ?? '',
    );
    const [error, setError] = useState<string | null>(null);
    const [isSaving, startSaving] = useTransition();

    const save = () => {
        startSaving(async () => {
            setError(null);
            const identRes = await updateIdentifiersAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                slug: slug.trim() || null,
                abbreviation: abbreviation.trim() || null,
            });
            if ('error' in identRes) {
                setError(identRes.error);
                return;
            }
            const metaRes = await updateGameMetadataAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                coverUrl: coverUrl.trim() || null,
                platforms: platformsText
                    .split(',')
                    .map((p) => p.trim())
                    .filter(Boolean),
                releaseYear: releaseYear ? Number(releaseYear) : null,
                discordUrl: discordUrl.trim() || null,
            });
            if ('error' in metaRes) {
                setError(metaRes.error);
                return;
            }
            onAdvance();
        });
    };

    const preview = coverUrl.trim() || data.game.image;

    return (
        <section>
            <h2 className="h4">Game details</h2>
            <p className="text-muted">
                Everything here is pre-filled from IGDB where we have it — fix
                what's wrong, skip what's fine.
            </p>
            <div className="row g-4">
                <div className="col-md-6">
                    <label className="form-label" htmlFor="cover-url">
                        Cover image URL
                    </label>
                    <div className="d-flex gap-3">
                        {preview && (
                            <img
                                src={preview}
                                alt="Cover preview"
                                width={72}
                                height={96}
                                className="rounded"
                                style={{ aspectRatio: '3 / 4' }}
                            />
                        )}
                        <input
                            id="cover-url"
                            className="form-control"
                            value={coverUrl}
                            onChange={(e) => setCoverUrl(e.target.value)}
                            placeholder="https://… (leave empty for IGDB art)"
                        />
                    </div>
                    <label className="form-label mt-3" htmlFor="release-year">
                        Release year
                    </label>
                    <input
                        id="release-year"
                        className="form-control"
                        inputMode="numeric"
                        value={releaseYear}
                        onChange={(e) => setReleaseYear(e.target.value)}
                    />
                    <label className="form-label mt-3" htmlFor="platforms">
                        Platforms (comma-separated)
                    </label>
                    <input
                        id="platforms"
                        className="form-control"
                        value={platformsText}
                        onChange={(e) => setPlatformsText(e.target.value)}
                        placeholder="PC, Switch, PS5"
                    />
                </div>
                <div className="col-md-6">
                    <label className="form-label" htmlFor="slug">
                        URL slug
                    </label>
                    <input
                        id="slug"
                        className="form-control"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                    />
                    <label className="form-label mt-3" htmlFor="abbreviation">
                        Abbreviation
                    </label>
                    <input
                        id="abbreviation"
                        className="form-control"
                        value={abbreviation}
                        onChange={(e) => setAbbreviation(e.target.value)}
                        placeholder="sm64"
                    />
                    <label className="form-label mt-3" htmlFor="discord">
                        Discord invite
                    </label>
                    <input
                        id="discord"
                        className="form-control"
                        value={discordUrl}
                        onChange={(e) => setDiscordUrl(e.target.value)}
                        placeholder="https://discord.gg/…"
                    />
                </div>
            </div>
            {error && <div className="alert alert-danger mt-3">{error}</div>}
            <button
                type="button"
                className="btn btn-primary mt-3"
                disabled={isSaving}
                onClick={save}
            >
                {isSaving ? 'Saving…' : 'Save & continue'}
            </button>
        </section>
    );
}
