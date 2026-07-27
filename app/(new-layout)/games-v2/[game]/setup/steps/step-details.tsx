'use client';

import { GameDetailsForm } from '../game-details-form';
import type { StepProps } from '../types';
import { StepHeader } from './step-header';

export function StepDetails({ data, onAdvance }: StepProps) {
    return (
        <section>
            <StepHeader
                step="details"
                title="Game details"
                lede={
                    data.categories.length > 0
                        ? 'Runners are already on this board. The details below are pre-filled from IGDB, so fix anything that’s wrong and move on. Everything saves as you go.'
                        : 'This board has no runs yet. The details below are pre-filled from IGDB, so fix anything that’s wrong and move on. Everything saves as you go.'
                }
            />
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
