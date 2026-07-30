'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
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
import { normalizeDiscordInvite } from '~src/utils/discord-invite';
import { updateIdentifiersAction } from '../manage/identifiers/actions/update-identifiers.action';
import { getCoverUploadUrlAction } from './actions/get-cover-upload-url.action';
import { updateGameMetadataAction } from './actions/update-game-metadata.action';
import { FieldLabel } from './field-hint';
import styles from './setup.module.scss';

const ALLOWED_COVER_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_COVER_SIZE = 2 * 1024 * 1024;

// Mirrors how the backend stores a slug, so the field can show what will
// actually be saved and reject input that normalizes to nothing before the
// request goes out. Not `~src/lib/normalize-slug` — that one strips spaces and
// dashes for *comparison*, which is a different transform.
const SLUG_MAX = 64;

function normalizeSlugForStorage(s: string): string {
    return s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

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
    savingExternally = false,
    formId,
    hideAction = false,
    onBusyChange,
}: {
    identifiers: GameIdentifiers;
    metadata: GameMetadata;
    game: { id: number; name: string; image: string | null };
    onSaved: () => void;
    saveLabel?: string;
    // Set while a caller's own post-onSaved work is still in flight, so the
    // button stays disabled through that gap instead of re-enabling between
    // this form's save and the caller's (see step-details.tsx).
    savingExternally?: boolean;
    /** id on the <form>, so an external `<button form=…>` can submit it. */
    formId?: string;
    /** Suppress the internal submit button (caller renders its own). */
    hideAction?: boolean;
    /** Reports isSaving/isUploading to a caller-rendered external button. */
    onBusyChange?: (busy: boolean) => void;
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

    const busy = isSaving || isUploading;
    useEffect(() => {
        onBusyChange?.(busy);
    }, [busy, onBusyChange]);

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

    const slugPreview = normalizeSlugForStorage(slug);

    const save = () => {
        if (isSaving || isUploading) return;
        setError(null);
        if (slug.trim() !== '' && slugPreview === '') {
            setError(
                'URL slug must contain at least one alphanumeric character.',
            );
            return;
        }
        if (slugPreview.length > SLUG_MAX) {
            setError(`URL slug must be ${SLUG_MAX} characters or fewer.`);
            return;
        }

        startSaving(async () => {
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
        <form
            id={formId}
            noValidate
            onSubmit={(e) => {
                e.preventDefault();
                save();
            }}
        >
            {metadata.igdbUrl && (
                <p className="text-muted small mb-3">
                    Prefilled data comes from{' '}
                    <a href={metadata.igdbUrl} target="_blank" rel="noreferrer">
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
            <div className="row g-4">
                <div className="col-md-6">
                    <FieldLabel
                        htmlFor="cover-upload"
                        label="Cover image"
                        hint="The box art shown for this game across the site. Prefilled from IGDB — upload your own if it’s wrong or missing. Portrait (3:4); anything else gets cropped."
                    />
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
                    <FieldLabel
                        className="mt-3"
                        htmlFor="release-year"
                        label="Release year"
                        hint="The year the game released, shown on the game page. Prefilled from IGDB — change it if the IGDB date is wrong."
                    />
                    <input
                        id="release-year"
                        className="form-control"
                        inputMode="numeric"
                        value={releaseYear}
                        onChange={(e) => setReleaseYear(e.target.value)}
                    />
                    <FieldLabel
                        className="mt-3"
                        htmlFor="platforms"
                        label="Platforms"
                        hint="The platforms this game is on, shown on the game page. Comma-separated. Prefilled from IGDB — edit it if you want."
                    />
                    <input
                        id="platforms"
                        className="form-control"
                        value={platformsText}
                        onChange={(e) => setPlatformsText(e.target.value)}
                        placeholder="PC, Switch, PS5"
                    />
                    <FieldLabel
                        className="mt-3"
                        htmlFor="about"
                        label="About"
                        hint="The description shown on the game page. Prefilled from IGDB — once you edit it, later IGDB syncs leave your text alone. Clear it to go back to the IGDB summary."
                    />
                    <textarea
                        id="about"
                        className="form-control"
                        rows={4}
                        maxLength={5000}
                        value={about}
                        onChange={(e) => setAbout(e.target.value)}
                        placeholder="A short description of the game, shown on the game page."
                    />
                </div>
                <div className="col-md-6">
                    <FieldLabel
                        htmlFor="slug"
                        label="URL slug"
                        hint={
                            <>
                                The name in this board&apos;s web address —{' '}
                                <code>sm64</code> makes the page{' '}
                                <code>therun.gg/games-v2/sm64</code>. Stored
                                lowercase with non-alphanumerics turned into
                                dashes, and must be unique across all games.
                                Leave it empty to keep the derived name.
                            </>
                        }
                    />
                    <input
                        id="slug"
                        className="form-control"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        placeholder="e.g. super-mario-64"
                    />
                    <small className="text-muted">
                        {slug.trim() === '' ? (
                            <>No slug set — falls back to the derived name.</>
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
                    <FieldLabel
                        className="mt-3"
                        htmlFor="discord"
                        label="Discord invite"
                        hint="Adds a Discord button to the game page. Use an invite that doesn’t expire, or the button eventually leads nowhere."
                    />
                    <input
                        id="discord"
                        className="form-control"
                        value={discordUrl}
                        onChange={(e) => setDiscordUrl(e.target.value)}
                        onBlur={(e) =>
                            setDiscordUrl(
                                normalizeDiscordInvite(e.target.value) ??
                                    e.target.value,
                            )
                        }
                        placeholder="https://discord.gg/… or just the code"
                    />
                    <p className="text-muted small mt-1 mb-0">
                        Paste the full invite link or only the code after
                        discord.gg/.
                    </p>
                    <FieldLabel
                        className="mt-3"
                        label="Links"
                        hint="Extra links shown as chips on the game page — wiki, official site, Twitch. Up to ten."
                    />
                    <p className="text-muted small mb-2">
                        A short label plus an https URL.
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
            {!hideAction && (
                <button
                    type="submit"
                    className={`${styles.primaryAction} mt-3`}
                    disabled={isSaving || isUploading || savingExternally}
                >
                    {isSaving || savingExternally ? 'Saving…' : saveLabel}
                </button>
            )}
        </form>
    );
}
