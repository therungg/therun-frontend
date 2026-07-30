'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import type { GameIdentifiers, GameMetadata } from '~src/lib/game-mgmt';
import { GameDetailsForm } from '../../setup/game-details-form';
import styles from './console.module.scss';
import { IgdbMatchSection } from './igdb-match-section';

export interface GameDetailsData {
    identifiers: GameIdentifiers;
    metadata: GameMetadata;
    game: { id: number; name: string; image: string | null };
    canRematch: boolean;
}

export function GameDetailsPane({
    identifiers,
    metadata,
    game,
    canRematch,
}: GameDetailsData) {
    const router = useRouter();

    return (
        <div className={styles.surface}>
            <div className={styles.paneHeader}>
                <h2 className={styles.paneTitle}>Details & metadata</h2>
            </div>
            <p className={styles.paneLede}>
                Shown on the public game page and in the setup wizard.
            </p>
            <GameDetailsForm
                identifiers={identifiers}
                metadata={metadata}
                game={game}
                saveLabel="Save details"
                onSaved={() => {
                    toast.success('Details saved');
                    router.refresh();
                }}
            />
            <IgdbMatchSection
                gameId={game.id}
                igdbUrl={metadata.igdbUrl}
                canRematch={canRematch}
            />
        </div>
    );
}
