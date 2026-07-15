'use client';

import { GameDetailsForm } from '../game-details-form';
import type { StepProps } from '../types';

export function StepDetails({ data, onAdvance }: StepProps) {
    return (
        <section>
            <h2 className="h4">Game details</h2>
            <p className="text-muted">
                Everything here is pre-filled from IGDB where we have it — fix
                what's wrong, skip what's fine.
            </p>
            <GameDetailsForm
                identifiers={data.identifiers}
                metadata={data.metadata}
                game={{
                    id: data.game.id,
                    name: data.game.name,
                    image: data.game.image ?? null,
                }}
                onSaved={onAdvance}
            />
        </section>
    );
}
