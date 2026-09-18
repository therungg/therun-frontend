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
 * The category's board icon, uploaded from its own matrix cell.
 *
 * An image was the one thing that looked like it needed a panel, which is what
 * kept the expanding row alive. It does not: the cell IS the control — a
 * thumbnail when there is one, a dashed square when there is not, and clicking
 * either opens the file picker. That reads as an icon slot in a way a tab
 * labelled "Icon" never did, and it is the only place on the screen where the
 * value and the editor can be the same object.
 *
 * Picking a file uploads it (presigned PUT) and saves the resulting URL in one
 * go, so there is no half state where the upload succeeded but the category
 * never got it.
 */
export function IconCell({ gameSlug, gameId, category }: Props) {
    const router = useRouter();
    const [isSaving, startSave] = useTransition();
    const [uploading, setUploading] = useState(false);

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
                toast.error(res.error);
                return;
            }
            router.refresh();
        });
    };

    const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.currentTarget.files?.[0];
        e.currentTarget.value = '';
        if (!file) return;

        if (!ALLOWED_TYPES.includes(file.type)) {
            toast.error('Icon must be PNG, JPEG, or WEBP.');
            return;
        }
        if (file.size > MAX_SIZE) {
            toast.error('Icon must be 2 MB or smaller.');
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
                toast.error(res.error);
                return;
            }
            const put = await fetch(res.result.uploadUrl, {
                method: 'PUT',
                body: file,
                headers: { 'Content-Type': file.type },
            });
            if (!put.ok) {
                toast.error(`Upload failed (${put.status}).`);
                return;
            }
            save(res.result.imageUrl);
        } catch {
            toast.error('Upload failed.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <span className={styles.iconCell}>
            <label
                className={`${styles.iconSlot} ${
                    imageUrl ? '' : styles.iconEmpty
                } ${uploading ? styles.iconUploading : ''}`}
                title={
                    imageUrl
                        ? `Replace ${category.display}'s icon`
                        : `Add an icon for ${category.display}`
                }
            >
                {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={imageUrl}
                        alt=""
                        width={24}
                        height={24}
                        className={styles.iconImage}
                    />
                ) : (
                    <span aria-hidden>{uploading ? '…' : '+'}</span>
                )}
                <input
                    type="file"
                    accept={ALLOWED_TYPES.join(',')}
                    disabled={busy}
                    onChange={onFile}
                    className="visually-hidden"
                    aria-label={`Icon for ${category.display}`}
                />
            </label>

            {imageUrl && (
                <button
                    type="button"
                    className={styles.iconClear}
                    disabled={busy}
                    aria-label={`Remove ${category.display}'s icon`}
                    onClick={() => save(null)}
                >
                    ✕
                </button>
            )}
        </span>
    );
}
