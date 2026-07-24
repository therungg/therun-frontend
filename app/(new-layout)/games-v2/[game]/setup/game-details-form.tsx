'use client';

import { useRef, useState, useTransition } from 'react';
import Link from '~src/components/link';
import type {
    GameIdentifiers,
    GameLink,
    GameMetadata,
} from '~src/lib/game-mgmt';
import {
    igdbPrefillPlatforms,
    igdbPrefillYear,
} from '~src/lib/setup/igdb-prefill';
import { updateIdentifiersAction } from '../manage/identifiers/actions/update-identifiers.action';
import { getCoverUploadUrlAction } from './actions/get-cover-upload-url.action';
import { updateGameMetadataAction } from './actions/update-game-metadata.action';
import styles from './setup.module.scss';

const ALLOWED_COVER_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_COVER_SIZE = 2 * 1024 * 1024;

// One-click starters for the links every board wants. "Website" is the
// generic official-site link; the icon on the game page keys off the URL.
const LINK_PRESETS = [
    { label: 'Wiki' },
    { label: 'Website' },
    { label: 'Twitch' },
];

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
    // Seed from IGDB when the mod-editable columns are still empty — sync
    // fills firstReleaseDate/igdbPlatforms, not these (see igdb-prefill.ts).
    const [platformsText, setPlatformsText] = useState(
        (metadata.platforms.length
            ? metadata.platforms
            : igdbPrefillPlatforms(metadata.igdbPlatforms)
        ).join(', '),
    );
    const [releaseYear, setReleaseYear] = useState(
        (
            metadata.releaseYear ?? igdbPrefillYear(metadata.firstReleaseDate)
        )?.toString() ?? '',
    );
    const [discordUrl, setDiscordUrl] = useState(metadata.discordUrl ?? '');
    const [about, setAbout] = useState(
        metadata.summaryOverride ?? metadata.summary ?? '',
    );
    const [links, setLinks] = useState<GameLink[]>(metadata.links ?? []);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, startSaving] = useTransition();
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const uploadCover = async (file: File | undefined) => {
        if (!file) return;
        setError(null);

        if (!ALLOWED_COVER_TYPES.includes(file.type)) {
            setError('Image must be PNG, JPEG, or WEBP.');
            return;
        }
        if (file.size > MAX_COVER_SIZE) {
            setError('Image must be 2 MB or smaller.');
            return;
        }

        setIsUploading(true);
        try {
            const res = await getCoverUploadUrlAction({
                gameSlug: game.name,
                gameId: game.id,
                contentType: file.type,
                contentLength: file.size,
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            const putRes = await fetch(res.result.uploadUrl, {
                method: 'PUT',
                body: file,
                headers: { 'Content-Type': file.type },
            });
            if (!putRes.ok) {
                setError(`Upload failed (${putRes.status}).`);
                return;
            }
            setCoverUrl(res.result.imageUrl);
        } catch {
            setError('Upload failed.');
        } finally {
            setIsUploading(false);
        }
    };

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
            // An About text identical to the IGDB summary stays a null
            // override, so future IGDB syncs keep refreshing it.
            const aboutTrimmed = about.trim();
            const metaRes = await updateGameMetadataAction({
                gameSlug: game.name,
                gameId: game.id,
                coverUrl: coverUrl.trim() || null,
                summaryOverride:
                    !aboutTrimmed ||
                    aboutTrimmed === (metadata.summary ?? '').trim()
                        ? null
                        : aboutTrimmed,
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
                    <label className="form-label" htmlFor="cover-upload">
                        Cover image
                    </label>
                    <div className="d-flex gap-3 align-items-start">
                        {preview && (
                            <img
                                src={preview}
                                alt="Cover preview"
                                width={96}
                                height={128}
                                className="rounded"
                                style={{
                                    aspectRatio: '3 / 4',
                                    objectFit: 'cover',
                                }}
                            />
                        )}
                        <div>
                            <input
                                ref={fileInputRef}
                                id="cover-upload"
                                type="file"
                                accept={ALLOWED_COVER_TYPES.join(',')}
                                className="d-none"
                                onChange={(e) => {
                                    void uploadCover(e.target.files?.[0]);
                                    e.target.value = '';
                                }}
                            />
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-primary d-block"
                                disabled={isUploading || isSaving}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {isUploading
                                    ? 'Uploading…'
                                    : coverUrl.trim()
                                      ? 'Replace image'
                                      : 'Upload image'}
                            </button>
                            {coverUrl.trim() && (
                                <button
                                    type="button"
                                    className="btn btn-sm btn-link px-0 d-block"
                                    disabled={isUploading || isSaving}
                                    onClick={() => setCoverUrl('')}
                                >
                                    Remove, use IGDB art
                                </button>
                            )}
                            <div className="text-muted small mt-1">
                                PNG, JPEG, or WEBP, up to 2 MB. Applies when you
                                save.
                            </div>
                        </div>
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
                    <label className="form-label mt-3" htmlFor="about">
                        About
                    </label>
                    <textarea
                        id="about"
                        className="form-control"
                        rows={4}
                        maxLength={5000}
                        value={about}
                        onChange={(e) => setAbout(e.target.value)}
                        placeholder="A short description of the game, shown on the game page."
                    />
                    {metadata.igdbUrl && (
                        <p className="text-muted small mt-2 mb-0">
                            Prefilled data comes from{' '}
                            <a
                                href={metadata.igdbUrl}
                                target="_blank"
                                rel="noreferrer"
                            >
                                this IGDB entry
                            </a>
                            . Wrong game?{' '}
                            <Link
                                href={`/games-v2/${game.name}/manage?pane=game-details`}
                            >
                                Fix the match
                            </Link>
                        </p>
                    )}
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
                    <div className="d-flex gap-2 flex-wrap mb-2">
                        {LINK_PRESETS.map((preset) => (
                            <button
                                key={preset.label}
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                disabled={
                                    links.length >= 10 ||
                                    links.some((l) => l.label === preset.label)
                                }
                                onClick={() =>
                                    setLinks((ls) => [
                                        ...ls,
                                        { label: preset.label, url: '' },
                                    ])
                                }
                            >
                                + {preset.label}
                            </button>
                        ))}
                    </div>
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
                disabled={isSaving || isUploading}
                onClick={save}
            >
                {isSaving ? 'Saving…' : saveLabel}
            </button>
        </>
    );
}
