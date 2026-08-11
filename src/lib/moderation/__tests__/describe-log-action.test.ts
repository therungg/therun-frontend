import { describe, expect, it } from 'vitest';
import { describeLogAction } from '../describe-log-action';

describe('describeLogAction', () => {
    describe('self-service verbs', () => {
        it('labels self_reject_run as "Hidden by runner"', () => {
            const result = describeLogAction('self_reject_run');
            expect(result.label).toBe('Hidden by runner');
            expect(result.severity).toBe('mute');
        });

        it('labels self_unreject_run as "Restored by runner"', () => {
            const result = describeLogAction('self_unreject_run');
            expect(result.label).toBe('Restored by runner');
            expect(result.severity).toBe('ok');
        });

        it('labels self_create_manual_time as "Time set by runner"', () => {
            const result = describeLogAction('self_create_manual_time');
            expect(result.label).toBe('Time set by runner');
            expect(result.severity).toBe('mute');
        });

        it('labels self_delete_manual_time as "Time removed by runner"', () => {
            const result = describeLogAction('self_delete_manual_time');
            expect(result.label).toBe('Time removed by runner');
            expect(result.severity).toBe('mute');
        });

        it('labels self_move_run as "Moved by runner"', () => {
            const result = describeLogAction('self_move_run');
            expect(result.label).toBe('Moved by runner');
            expect(result.severity).toBe('mute');
        });
    });

    describe('deny-list feed fallthrough', () => {
        it('falls through to generic label for unknown action strings', () => {
            const result = describeLogAction('unknown_future_verb');
            expect(result.label).toBe('Unknown future verb');
            expect(result.severity).toBe('mute');
        });

        it('title-cases snake_case in the generic label', () => {
            const result = describeLogAction('foo_bar_baz');
            expect(result.label).toBe('Foo bar baz');
        });
    });

    describe('existing actions still work', () => {
        it('maps verdict_verify correctly', () => {
            const result = describeLogAction('verdict_verify');
            expect(result.label).toBe('Verified');
            expect(result.severity).toBe('ok');
        });

        it('maps exclude_run correctly', () => {
            const result = describeLogAction('exclude_run');
            expect(result.label).toBe('Removed');
            expect(result.severity).toBe('danger');
        });
    });
});
