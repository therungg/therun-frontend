'use client';

import { useRouter } from 'next/navigation';
import { type CSSProperties, useRef, useState } from 'react';
import { Upload } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import styles from '~src/components/console-chrome/console.module.scss';
import type { GameIdentifiers, GameMetadata } from '~src/lib/game-mgmt';
import {
    type GameTheme,
    TOPBAR_STYLES,
    type TopbarStyle,
} from '~src/lib/game-theme';
import { updateGameMetadataAction } from '../../setup/actions/update-game-metadata.action';
import { deriveThemeVars } from '../../theme/theme-css';
import { normalizeThemeColors } from '../../theme/theme-normalize';
import kit from '../shared/form-kit.module.scss';
import { getBackgroundUploadUrlAction } from './actions/get-background-upload-url.action';
import paneStyles from './theme-pane.module.scss';

const DEFAULT_DRAFT: GameTheme = {
    panelColor: '#161c18', // current dark-panel neighborhood
    accentColor: '#4aa06a', // brand-green neighborhood
    backgroundColor: '#0d0f0d', // current canvas
    backgroundUrl: null,
    panelOpacity: 0.92,
    topbar: 'default',
};

const TOPBAR_LABELS: Record<TopbarStyle, string> = {
    default: 'Default',
    accent: 'Accent',
    panel: 'Panel',
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
    // Preview the READABILITY-ADJUSTED colors — the backend nudges the picked
    // colors to the legibility margins on save (normalizeThemeColors, mirrored
    // here), so the preview shows exactly what will be stored. The picker
    // swatches stay bound to the raw `draft` so dragging is smooth.
    const previewTheme = { ...t, ...normalizeThemeColors(t) };
    // Custom-property keys aren't in CSSProperties; the double cast is the
    // standard escape hatch for style={{ '--x': ... }} objects.
    const previewVars = deriveThemeVars(
        previewTheme,
        'dark',
    ) as unknown as CSSProperties;

    return (
        <div className={styles.surface}>
            <header className={styles.paneHeader}>
                <div>
                    <div className={styles.paneEyebrow}>Game</div>
                    <h2 className={styles.paneTitle}>Theme</h2>
                </div>
                <div className={styles.paneActions}>
                    {metadata.theme != null && (
                        <button
                            type="button"
                            className={paneStyles.removeTheme}
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
            </header>

            <p className={styles.paneLede}>
                Colors and an optional background image for the public board.
                Text contrast adjusts automatically.
            </p>

            <div className={paneStyles.layout}>
                <div className={paneStyles.controls}>
                    <div>
                        <div className={paneStyles.controlLabel}>Colors</div>
                        <div className={paneStyles.swatchRow}>
                            <label className={paneStyles.swatch}>
                                <input
                                    type="color"
                                    className={paneStyles.swatchInput}
                                    value={t.panelColor}
                                    onChange={(e) =>
                                        setDraft({
                                            ...t,
                                            panelColor: e.target.value,
                                        })
                                    }
                                />
                                <span className={paneStyles.swatchText}>
                                    <span className={paneStyles.swatchName}>
                                        Panel
                                    </span>
                                    <span className={paneStyles.swatchHex}>
                                        {t.panelColor}
                                    </span>
                                </span>
                            </label>
                            <label className={paneStyles.swatch}>
                                <input
                                    type="color"
                                    className={paneStyles.swatchInput}
                                    value={t.accentColor}
                                    onChange={(e) =>
                                        setDraft({
                                            ...t,
                                            accentColor: e.target.value,
                                        })
                                    }
                                />
                                <span className={paneStyles.swatchText}>
                                    <span className={paneStyles.swatchName}>
                                        Accent
                                    </span>
                                    <span className={paneStyles.swatchHex}>
                                        {t.accentColor}
                                    </span>
                                </span>
                            </label>
                            <label className={paneStyles.swatch}>
                                <input
                                    type="color"
                                    className={paneStyles.swatchInput}
                                    value={t.backgroundColor}
                                    onChange={(e) =>
                                        setDraft({
                                            ...t,
                                            backgroundColor: e.target.value,
                                        })
                                    }
                                />
                                <span className={paneStyles.swatchText}>
                                    <span className={paneStyles.swatchName}>
                                        Page background
                                    </span>
                                    <span className={paneStyles.swatchHex}>
                                        {t.backgroundColor}
                                    </span>
                                </span>
                            </label>
                        </div>
                    </div>
                    <div>
                        <div className={paneStyles.controlLabel}>Topbar</div>
                        <div
                            className={paneStyles.segmented}
                            role="group"
                            aria-label="Topbar color"
                        >
                            {TOPBAR_STYLES.map((style) => (
                                <button
                                    key={style}
                                    type="button"
                                    aria-pressed={t.topbar === style}
                                    className={
                                        t.topbar === style
                                            ? paneStyles.segActive
                                            : paneStyles.seg
                                    }
                                    onClick={() =>
                                        setDraft({ ...t, topbar: style })
                                    }
                                >
                                    {TOPBAR_LABELS[style]}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <div className={paneStyles.controlLabel}>
                            Background image
                        </div>
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
                                    className={paneStyles.removeImage}
                                    disabled={busy}
                                    onClick={() =>
                                        setDraft({ ...t, backgroundUrl: null })
                                    }
                                >
                                    Remove image
                                </button>
                            </div>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    className={paneStyles.uploadTile}
                                    disabled={busy}
                                    onClick={() => fileInput.current?.click()}
                                >
                                    <Upload size={16} aria-hidden />
                                    Upload image
                                </button>
                                <div className={paneStyles.uploadHint}>
                                    PNG, JPEG, or WEBP, up to 6 MB.
                                </div>
                            </>
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
                        <div>
                            <label
                                className={paneStyles.controlLabel}
                                htmlFor="theme-panel-opacity"
                            >
                                Panel opacity
                            </label>
                            <div className={paneStyles.rangeRow}>
                                <input
                                    id="theme-panel-opacity"
                                    type="range"
                                    className={paneStyles.range}
                                    min={85}
                                    max={100}
                                    value={Math.round(t.panelOpacity * 100)}
                                    onChange={(e) =>
                                        setDraft({
                                            ...t,
                                            panelOpacity:
                                                Number(e.target.value) / 100,
                                        })
                                    }
                                />
                                <span className={paneStyles.rangeValue}>
                                    {Math.round(t.panelOpacity * 100)}%
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <div className={paneStyles.previewCol}>
                    <div className={paneStyles.previewLabel} aria-hidden>
                        Preview
                    </div>
                    <div
                        className={paneStyles.preview}
                        style={previewVars}
                        aria-hidden
                    >
                        <div
                            className={paneStyles.previewTopbar}
                            data-topbar={t.topbar}
                        >
                            <span className={paneStyles.previewBrand} />
                            <span className={paneStyles.previewNav}>
                                <i />
                                <i />
                                <i />
                            </span>
                        </div>
                        <div className={paneStyles.previewCanvas}>
                            {previewTheme.backgroundUrl && (
                                <div
                                    className={paneStyles.previewBackdrop}
                                    style={{
                                        backgroundImage: `url(${previewTheme.backgroundUrl})`,
                                    }}
                                />
                            )}
                            <div className={paneStyles.previewPanel}>
                                <div className={paneStyles.previewMast}>
                                    <span
                                        className={paneStyles.previewMastTitle}
                                    />
                                    <span className={paneStyles.previewPill}>
                                        PB
                                    </span>
                                </div>
                                <div className={paneStyles.previewBoard}>
                                    <div
                                        className={`${paneStyles.previewRow} ${paneStyles.previewRowLead}`}
                                    >
                                        <span
                                            className={paneStyles.previewRank}
                                        >
                                            1
                                        </span>
                                        <span
                                            className={paneStyles.previewName}
                                        />
                                        <span
                                            className={paneStyles.previewTime}
                                        />
                                    </div>
                                    <div className={paneStyles.previewRow}>
                                        <span
                                            className={paneStyles.previewRank}
                                        >
                                            2
                                        </span>
                                        <span
                                            className={paneStyles.previewName}
                                        />
                                        <span
                                            className={paneStyles.previewTime}
                                        />
                                    </div>
                                    <div className={paneStyles.previewRow}>
                                        <span
                                            className={paneStyles.previewRank}
                                        >
                                            3
                                        </span>
                                        <span
                                            className={paneStyles.previewName}
                                        />
                                        <span
                                            className={paneStyles.previewTime}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
