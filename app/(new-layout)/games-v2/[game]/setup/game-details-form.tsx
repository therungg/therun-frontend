'use client';

import { useState, useTransition } from 'react';
import type {
    GameIdentifiers,
    GameLink,
    GameMetadata,
} from '~src/lib/game-mgmt';
import { updateIdentifiersAction } from '../manage/identifiers/actions/update-identifiers.action';
import { updateGameMetadataAction } from './actions/update-game-metadata.action';
import styles from './setup.module.scss';

export function GameDetailsForm({
    identifiers,
    metadata,
    game,
    onSaved,
    saveLabel = 'Save & continue',
}: {
    identifiers: GameIdentifiers;
    metadata: GameMetadata;
    game: { id: number; name: string; image: string | null };
    onSaved: () => void;
    saveLabel?: string;
}) {
    const [slug, setSlug] = useState(identifiers.slug ?? '');
    const [coverUrl, setCoverUrl] = useState(metadata.coverUrl ?? '');
    const [platformsText, setPlatformsText] = useState(
        metadata.platforms.join(', '),
    );
    const [releaseYear, setReleaseYear] = useState(
        metadata.releaseYear?.toString() ?? '',
    );
    const [discordUrl, setDiscordUrl] = useState(metadata.discordUrl ?? '');
    const [links, setLinks] = useState<GameLink[]>(metadata.links ?? []);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, startSaving] = useTransition();

    const updateLink = (index: number, patch: Partial<GameLink>) => {
        setLinks((ls) =>
            ls.map((l, i) => (i === index ? { ...l, ...patch } : l)),
        );
    };

    const removeLink = (index: number) => {
        setLinks((ls) => ls.filter((_, i) => i !== index));
    };

    const addLink = () => {
        setLinks((ls) => [...ls, { label: '', url: '' }]);
    };

    const save = () => {
        startSaving(async () => {
            setError(null);
            const identRes = await updateIdentifiersAction({
                gameSlug: game.name,
                gameId: game.id,
                slug: slug.trim() || null,
            });
            if ('error' in identRes) {
                setError(identRes.error);
                return;
            }
            const metaRes = await updateGameMetadataAction({
                gameSlug: game.name,
                gameId: game.id,
                coverUrl: coverUrl.trim() || null,
                platforms: platformsText
                    .split(',')
                    .map((p) => p.trim())
                    .filter(Boolean),
                releaseYear: releaseYear.trim()
                    ? Number(releaseYear.trim())
                    : null,
                discordUrl: discordUrl.trim() || null,
                links: links
                    .map((l) => ({ label: l.label.trim(), url: l.url.trim() }))
                    .filter((l) => l.label !== '' || l.url !== ''),
            });
            if ('error' in metaRes) {
                setError(metaRes.error);
                return;
            }
            onSaved();
        });
    };

    const preview = coverUrl.trim() || game.image;

    return (
        <>
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
                    <label className="form-label mt-3">Links</label>
                    <p className="text-muted small mb-2">
                        Shown as chips on the game page. Label + https URL.
                    </p>
                    {links.map((link, index) => (
                        <div key={index} className="d-flex gap-2 mb-2">
                            <input
                                className="form-control"
                                style={{ maxWidth: '8rem' }}
                                maxLength={40}
                                value={link.label}
                                onChange={(e) =>
                                    updateLink(index, { label: e.target.value })
                                }
                                placeholder="Twitch"
                            />
                            <input
                                type="url"
                                className="form-control"
                                value={link.url}
                                onChange={(e) =>
                                    updateLink(index, { url: e.target.value })
                                }
                                placeholder="https://…"
                            />
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => removeLink(index)}
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        disabled={links.length >= 10}
                        onClick={addLink}
                    >
                        Add link
                    </button>
                </div>
            </div>
            {error && <div className={`${styles.errorNote} mt-3`}>{error}</div>}
            <button
                type="button"
                className={`${styles.primaryAction} mt-3`}
                disabled={isSaving}
                onClick={save}
            >
                {isSaving ? 'Saving…' : saveLabel}
            </button>
        </>
    );
}
