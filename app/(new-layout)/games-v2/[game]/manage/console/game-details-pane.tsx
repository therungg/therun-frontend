'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import type { GameIdentifiers, GameMetadata } from '~src/lib/game-mgmt';
import { GameDetailsForm } from '../../setup/game-details-form';
import styles from './console.module.scss';

export interface GameDetailsData {
    identifiers: GameIdentifiers;
    metadata: GameMetadata;
    game: { id: number; name: string; image: string | null };
}

export function GameDetailsPane({
    identifiers,
    metadata,
    game,
}: GameDetailsData) {
    const router = useRouter();

    return (
        <div className={styles.surface}>
            <div className={styles.paneHeader}>
                <h2 className={styles.paneTitle}>Details & metadata</h2>
            </div>
            <p className="text-muted small mb-3">
                These details feed the setup wizard; showing them on the public
                game page is a follow-up.
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
        </div>
    );
}
