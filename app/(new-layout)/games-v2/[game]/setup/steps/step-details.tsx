'use client';

import { GameDetailsForm } from '../game-details-form';
import type { StepProps } from '../types';
import { StepHeader } from './step-header';

export function StepDetails({ data, onAdvance }: StepProps) {
    return (
        <section>
            <StepHeader
                num={1}
                title="First, the game itself"
                lede={
                    data.categories.length > 0
                        ? 'Runners are already racing here — your job is to curate, not build from scratch. Everything below is pre-filled from IGDB where we have it: fix what’s wrong, skip what’s fine. Every step saves as you go.'
                        : 'No runs have been ingested yet — you’re setting this board up fresh. Everything below is pre-filled from IGDB where we have it: fix what’s wrong, skip what’s fine. Every step saves as you go.'
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
