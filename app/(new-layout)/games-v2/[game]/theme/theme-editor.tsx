'use client';

import { type CSSProperties, useRef, useState } from 'react';
import { Upload } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import {
    type GameTheme,
    TOPBAR_STYLES,
    type TopbarStyle,
} from '~src/lib/game-theme';
import paneStyles from '../manage/console/theme-pane.module.scss';
import { deriveThemeVars } from './theme-css';
import { normalizeThemeColors } from './theme-normalize';

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

type UploadUrlResult =
    | { result: { uploadUrl: string; imageUrl: string } }
    | { error: string };

interface Props {
    value: GameTheme | null;
    onChange: (theme: GameTheme | null) => void;
    requestUploadUrl: (file: File) => Promise<UploadUrlResult>;
    busy?: boolean;
}

// Pickers, topbar segment, opacity, background upload + remove, live
// preview. Shared by the game console's Theme pane and the runner's own
// Theme settings — both just own the draft state and hand it in as `value`.
export function ThemeEditor({
    value,
    onChange,
    requestUploadUrl,
    busy = false,
}: Props) {
    const [uploading, setUploading] = useState(false);
    const fileInput = useRef<HTMLInputElement>(null);
    const disabled = busy || uploading;

    const uploadBackground = async (file: File) => {
        setUploading(true);
        const urlRes = await requestUploadUrl(file);
        if ('error' in urlRes) {
            setUploading(false);
            toast.error(urlRes.error);
            return;
        }
        const put = await fetch(urlRes.result.uploadUrl, {
            method: 'PUT',
            body: file,
        }).catch(() => null);
        setUploading(false);
        if (!put?.ok) {
            toast.error('Upload failed.');
            return;
        }
        onChange({
            ...(value ?? DEFAULT_DRAFT),
            backgroundUrl: urlRes.result.imageUrl,
        });
    };

    const t = value ?? DEFAULT_DRAFT;
    // Preview the READABILITY-ADJUSTED colors — the backend nudges the picked
    // colors to the legibility margins on save (normalizeThemeColors, mirrored
    // here), so the preview shows exactly what will be stored. The picker
    // swatches stay bound to the raw `value` so dragging is smooth.
    const previewTheme = { ...t, ...normalizeThemeColors(t) };
    // Custom-property keys aren't in CSSProperties; the double cast is the
    // standard escape hatch for style={{ '--x': ... }} objects.
    const previewVars = deriveThemeVars(
        previewTheme,
        'dark',
    ) as unknown as CSSProperties;

    return (
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
                                    onChange({
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
                                    onChange({
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
                                    onChange({
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
                                    onChange({ ...t, topbar: style })
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
                                disabled={disabled}
                                onClick={() =>
                                    onChange({ ...t, backgroundUrl: null })
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
                                disabled={disabled}
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
                                    onChange({
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
                                <span className={paneStyles.previewMastTitle} />
                                <span className={paneStyles.previewPill}>
                                    PB
                                </span>
                            </div>
                            <div className={paneStyles.previewBoard}>
                                <div
                                    className={`${paneStyles.previewRow} ${paneStyles.previewRowLead}`}
                                >
                                    <span className={paneStyles.previewRank}>
                                        1
                                    </span>
                                    <span className={paneStyles.previewName} />
                                    <span className={paneStyles.previewTime} />
                                </div>
                                <div className={paneStyles.previewRow}>
                                    <span className={paneStyles.previewRank}>
                                        2
                                    </span>
                                    <span className={paneStyles.previewName} />
                                    <span className={paneStyles.previewTime} />
                                </div>
                                <div className={paneStyles.previewRow}>
                                    <span className={paneStyles.previewRank}>
                                        3
                                    </span>
                                    <span className={paneStyles.previewName} />
                                    <span className={paneStyles.previewTime} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
