'use client';

import { useSyncExternalStore } from 'react';
import {
    clock,
    offsetMinutes,
    place,
} from '../../(sections)/activity/time-of-day';

const noop = () => undefined;
const subscribeNothing = () => noop;

/** The runner's usual hours, in the viewer's clock once mounted. */
export function UsualHours({
    startHour,
    endHour,
    timezone,
}: {
    startHour: number;
    endHour: number;
    timezone: string;
}) {
    const mounted = useSyncExternalStore(
        subscribeNothing,
        () => true,
        () => false,
    );
    if (!mounted) {
        return (
            <>
                {clock(startHour * 60)}–{clock(endHour * 60)} in{' '}
                {place(timezone)}
            </>
        );
    }
    const now = new Date();
    const runner = offsetMinutes(timezone, now);
    const shift = runner === null ? 0 : -now.getTimezoneOffset() - runner;
    return (
        <>
            {clock(startHour * 60 + shift)}–{clock(endHour * 60 + shift)}
        </>
    );
}
