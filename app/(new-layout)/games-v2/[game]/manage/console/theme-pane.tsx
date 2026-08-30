'use client';

import { useRouter } from 'next/navigation';
import { type CSSProperties, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import styles from '~src/components/console-chrome/console.module.scss';
import type { GameIdentifiers, GameMetadata } from '~src/lib/game-mgmt';
import type { GameTheme } from '~src/lib/game-theme';
import { updateGameMetadataAction } from '../../setup/actions/update-game-metadata.action';
import { deriveThemeVars } from '../../theme/theme-css';
import kit from '../shared/form-kit.module.scss';
import { getBackgroundUploadUrlAction } from './actions/get-background-upload-url.action';
import paneStyles from './theme-pane.module.scss';

const DEFAULT_DRAFT: GameTheme = {
    panelColor: '#161c18', // current dark-panel neighborhood
    accentColor: '#4aa06a', // brand-green neighborhood
    backgroundColor: '#0d0f0d', // current canvas
    backgroundUrl: null,
    panelOpacity: 0.92,
};

interface Props {
    identifiers: GameIdentifiers;
    metadata: GameMetadata;
    game: { id: number; name: string };
}

// `identifiers.slug` is nullable (a game can be unmatched); `game.name` is
// the resolved slug string used across the console for API calls — see
// game-details-form.tsx, which does the same substitution.
export function ThemePane({ metadata, game }: Props) {
    const router = useRouter();
    const [draft, setDraft] = useState<GameTheme | null>(metadata.theme);
    const [busy, setBusy] = useState(false);
    const fileInput = useRef<HTMLInputElement>(null);

    const save = async (theme: GameTheme | null) => {
        setBusy(true);
        const res = await updateGameMetadataAction({
            gameSlug: game.name,
            gameId: game.id,
            theme,
        });
        setBusy(false);
        if ('error' in res) {
            toast.error(res.error);
            return;
        }
        toast.success(theme ? 'Theme saved.' : 'Theme removed.');
        router.refresh();
    };

    const uploadBackground = async (file: File) => {
        setBusy(true);
        const urlRes = await getBackgroundUploadUrlAction({
            gameSlug: game.name,
            gameId: game.id,
            contentType: file.type,
            contentLength: file.size,
        });
        if ('error' in urlRes) {
            setBusy(false);
            toast.error(urlRes.error);
            return;
        }
        const put = await fetch(urlRes.result.uploadUrl, {
            method: 'PUT',
            body: file,
        }).catch(() => null);
        setBusy(false);
        if (!put?.ok) {
            toast.error('Upload failed.');
            return;
        }
        setDraft((d) => ({
            ...(d ?? DEFAULT_DRAFT),
            backgroundUrl: urlRes.result.imageUrl,
        }));
    };

    const t = draft ?? DEFAULT_DRAFT;
    // Custom-property keys aren't in CSSProperties; the double cast is the
    // standard escape hatch for style={{ '--x': ... }} objects.
    const previewVars = deriveThemeVars(t, 'dark') as unknown as CSSProperties;

    return (
        <div className={styles.surface}>
            <div className={styles.paneHeader}>
                <h2 className={styles.paneTitle}>Theme</h2>
                <div className={styles.paneActions}>
                    {metadata.theme != null && (
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            disabled={busy}
                            onClick={() => {
                                setDraft(null);
                                void save(null);
                            }}
                        >
                            Remove theme
                        </button>
                    )}
                    <button
                        type="button"
                        className={kit.saveBtn}
                        disabled={busy || draft == null}
                        onClick={() => draft && void save(draft)}
                    >
                        {busy ? 'Saving…' : 'Save theme'}
                    </button>
                </div>
            </div>

            <p className={styles.paneLede}>
                Give {game.name}&rsquo;s board its own look. Pick the panel,
                accent, and page-background colors and optionally a background
                image — text contrast is handled automatically.
            </p>

            <div className={paneStyles.controls}>
                <label className={paneStyles.field}>
                    <span>Panel color</span>
                    <input
                        type="color"
                        value={t.panelColor}
                        onChange={(e) =>
                            setDraft({ ...t, panelColor: e.target.value })
                        }
                    />
                </label>
                <label className={paneStyles.field}>
                    <span>Accent color</span>
                    <input
                        type="color"
                        value={t.accentColor}
                        onChange={(e) =>
                            setDraft({ ...t, accentColor: e.target.value })
                        }
                    />
                </label>
                <label className={paneStyles.field}>
                    <span>Page background</span>
                    <input
                        type="color"
                        value={t.backgroundColor}
                        onChange={(e) =>
                            setDraft({ ...t, backgroundColor: e.target.value })
                        }
                    />
                </label>
                <div className={paneStyles.field}>
                    <span>Background image</span>
                    {t.backgroundUrl ? (
                        <div className={paneStyles.bgRow}>
                            {/* Backend media CDN; plain img is fine here. */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={t.backgroundUrl}
                                alt=""
                                className={paneStyles.bgThumb}
                            />
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                disabled={busy}
                                onClick={() =>
                                    setDraft({ ...t, backgroundUrl: null })
                                }
                            >
                                Remove image
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            disabled={busy}
                            onClick={() => fileInput.current?.click()}
                        >
                            Upload image (PNG/JPEG/WEBP, max 6 MB)
                        </button>
                    )}
                    <input
                        ref={fileInput}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        hidden
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) void uploadBackground(f);
                            e.target.value = '';
                        }}
                    />
                </div>
                {t.backgroundUrl != null && (
                    <label className={paneStyles.field}>
                        <span>Panel opacity</span>
                        <input
                            type="range"
                            min={85}
                            max={100}
                            value={Math.round(t.panelOpacity * 100)}
                            onChange={(e) =>
                                setDraft({
                                    ...t,
                                    panelOpacity: Number(e.target.value) / 100,
                                })
                            }
                        />
                    </label>
                )}
            </div>

            <div className={paneStyles.preview} style={previewVars} aria-hidden>
                <div className={paneStyles.previewPanel}>
                    <div className={paneStyles.previewAccent} />
                    <div className={paneStyles.previewRows}>
                        <span />
                        <span />
                        <span />
                    </div>
                </div>
            </div>
        </div>
    );
}
