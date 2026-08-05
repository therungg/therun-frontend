'use client';

import { useRouter } from 'next/navigation';
import { type ChangeEvent, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type { ResolvedCategory } from '../../../../../../../types/leaderboards.types';
import { getEmblemUploadUrlAction } from '../../../manage/category-tab/actions/get-emblem-upload-url.action';
import { updateCategorySettingsAction } from '../../../manage/category-tab/actions/update-category-settings.action';
import styles from './matrix.module.scss';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_SIZE = 2 * 1024 * 1024;

interface Props {
    gameSlug: string;
    gameId: number;
    category: ResolvedCategory;
}

/**
 * The icon shown next to a category on the board.
 *
 * The only per-category field with nothing to inherit and no sensible column —
 * an image cell in a 30-row matrix is noise. It gets a pane instead, so the
 * matrix stays the one place everything is set without carrying a picture in
 * every row.
 *
 * Picking a file uploads it straight away (presigned PUT) and then saves the
 * resulting URL, so there is no half state where an upload succeeded but the
 * category never got it.
 */
export function EmblemPanel({ gameSlug, gameId, category }: Props) {
    const router = useRouter();
    const [isSaving, startSave] = useTransition();
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const imageUrl = category.imageUrl ?? '';
    const busy = isSaving || uploading;

    const save = (next: string | null) => {
        startSave(async () => {
            const res = await updateCategorySettingsAction({
                gameSlug,
                gameId,
                categoryId: category.id,
                imageUrl: next,
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            toast.success(
                next
                    ? `Icon set for ${category.display}.`
                    : `Icon removed from ${category.display}.`,
            );
            router.refresh();
        });
    };

    const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.currentTarget.files?.[0];
        e.currentTarget.value = '';
        if (!file) return;
        setError(null);

        if (!ALLOWED_TYPES.includes(file.type)) {
            setError('Image must be PNG, JPEG, or WEBP.');
            return;
        }
        if (file.size > MAX_SIZE) {
            setError('Image must be 2 MB or smaller.');
            return;
        }

        setUploading(true);
        try {
            const res = await getEmblemUploadUrlAction({
                gameSlug,
                gameId,
                categoryId: category.id,
                contentType: file.type,
                contentLength: file.size,
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            const put = await fetch(res.result.uploadUrl, {
                method: 'PUT',
                body: file,
                headers: { 'Content-Type': file.type },
            });
            if (!put.ok) {
                setError(`Upload failed (${put.status}).`);
                return;
            }
            save(res.result.imageUrl);
        } catch {
            setError('Upload failed.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className={styles.panePad}>
            <div className={styles.emblemRow}>
                {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={imageUrl}
                        alt=""
                        width={48}
                        height={48}
                        className={styles.emblemImage}
                    />
                ) : (
                    <span className={styles.emblemEmpty}>none</span>
                )}

                <label className={styles.rulesChip}>
                    {uploading ? 'Uploading…' : 'Choose image'}
                    <input
                        type="file"
                        accept={ALLOWED_TYPES.join(',')}
                        disabled={busy}
                        onChange={onFile}
                        className="visually-hidden"
                    />
                </label>

                {imageUrl && (
                    <button
                        type="button"
                        className={styles.rulesChip}
                        disabled={busy}
                        onClick={() => save(null)}
                    >
                        Remove
                    </button>
                )}

                <span className={styles.paneNote}>
                    PNG, JPEG or WEBP, up to 2 MB.
                </span>
            </div>

            {error && <p className={styles.paneError}>{error}</p>}
        </div>
    );
}
