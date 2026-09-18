'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-toastify';
import styles from '~src/components/console-chrome/console.module.scss';
import type { GameIdentifiers, GameMetadata } from '~src/lib/game-mgmt';
import type { GameTheme } from '~src/lib/game-theme';
import { updateGameMetadataAction } from '../../setup/actions/update-game-metadata.action';
import { ThemeEditor } from '../../theme/theme-editor';
import kit from '../shared/form-kit.module.scss';
import { getBackgroundUploadUrlAction } from './actions/get-background-upload-url.action';
import paneStyles from './theme-pane.module.scss';

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

            <ThemeEditor
                value={draft}
                onChange={setDraft}
                busy={busy}
                requestUploadUrl={(file) =>
                    getBackgroundUploadUrlAction({
                        gameSlug: game.name,
                        gameId: game.id,
                        contentType: file.type,
                        contentLength: file.size,
                    })
                }
            />
        </div>
    );
}
