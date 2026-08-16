// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, test } from 'vitest';
import type { ModTiming } from '../../../../types/moderation.types';
import { RunTimesField } from '../run-times-field';
import { typeDuration } from '../test-utils';

function Harness({
    primaryTiming = 'gametime' as ModTiming,
    gameTimeLabel = 'igt',
    showSecondary = true,
    showErrors = false,
    initialPrimary = null as number | null,
    initialSecondary = null as number | null,
}) {
    const [primaryMs, setPrimaryMs] = useState<number | null>(initialPrimary);
    const [secondaryMs, setSecondaryMs] = useState<number | null>(
        initialSecondary,
    );
    return (
        <RunTimesField
            primaryTiming={primaryTiming}
            gameTimeLabel={gameTimeLabel}
            showSecondary={showSecondary}
            primaryMs={primaryMs}
            onPrimaryChange={setPrimaryMs}
            secondaryMs={secondaryMs}
            onSecondaryChange={setSecondaryMs}
            showErrors={showErrors}
        />
    );
}

const inputs = () => Array.from(document.querySelectorAll('input'));

describe('RunTimesField', () => {
    test('names each clock as the board says it', () => {
        render(<Harness gameTimeLabel="lrt" />);
        expect(screen.getByText('LRT')).toBeDefined();
        expect(screen.getByText('Real time')).toBeDefined();
    });

    // Joey, 2026-08-16: "if RTA, don't even ask for IGT" — a real-time board
    // takes one time and nothing else.
    test('asks for one time on a real-time board', () => {
        render(<Harness primaryTiming="realtime" />);
        expect(inputs()).toHaveLength(1);
    });

    test('still offers the real time when a game-timed board hides it', () => {
        render(<Harness showSecondary={false} />);
        expect(inputs()).toHaveLength(2);
        expect(screen.getByText('Optional')).toBeDefined();
    });

    test('marks the second clock required on a game-timed board', () => {
        render(<Harness />);
        expect(screen.getByText('Required')).toBeDefined();
    });

    test('names the clocks a real-time board does show', () => {
        render(<Harness primaryTiming="realtime" />);
        expect(screen.getByText('Real time')).toBeDefined();
        expect(screen.queryByText('IGT')).toBeNull();
    });

    test('reports the missing required time once the form is tried', () => {
        render(<Harness showErrors initialPrimary={90_000} />);
        expect(
            screen.getByText(
                'This board shows both times, so both are required.',
            ),
        ).toBeDefined();
    });

    test('derives the loads from both clocks', () => {
        render(<Harness initialPrimary={90_000} initialSecondary={102_000} />);
        expect(screen.getByText('0:12')).toBeDefined();
    });

    test('warns instead of showing loads when the pair is transposed', () => {
        render(<Harness initialPrimary={102_000} initialSecondary={90_000} />);
        expect(
            screen.getByText(
                'Real time is below game time. Check the two are the right way round.',
            ),
        ).toBeDefined();
    });

    test('each field owns its own value', () => {
        const { container } = render(<Harness />);
        const [primary, secondary] = Array.from(
            container.querySelectorAll('input'),
        );

        // Focus first: an unfocused field re-seeds its draft from the value
        // it is handed, which is exactly what a real user never does.
        fireEvent.focus(primary);
        typeDuration(primary, '900');
        expect(primary.value).toBe('9:00');
        expect(secondary.value).toBe('');

        fireEvent.focus(secondary);
        typeDuration(secondary, '1000');
        expect(primary.value).toBe('9:00');
        expect(secondary.value).toBe('10:00');
    });
});
