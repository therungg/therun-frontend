'use client';

import { useEffect, useRef, useState } from 'react';
import type {
    CategoryReassignment,
    GameReassignment,
} from '../../../../../../types/reassignments.types';

type AnyReassignment = GameReassignment | CategoryReassignment;
const TERMINAL = new Set(['completed', 'failed', 'undone']);

export function useReassignmentStatus<T extends AnyReassignment>(
    id: number | null,
    fetcher: (id: number) => Promise<T>,
): { data: T | null; error: string | null } {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fetcherRef = useRef(fetcher);
    fetcherRef.current = fetcher;

    useEffect(() => {
        if (id === null) return;
        let cancelled = false;

        const poll = async () => {
            try {
                const result = await fetcherRef.current(id);
                if (cancelled) return;
                setData(result);
                setError(null);
                if (TERMINAL.has(result.status)) {
                    clearInterval(interval);
                }
            } catch (err) {
                if (cancelled) return;
                setError(err instanceof Error ? err.message : 'Poll failed');
            }
        };

        const interval = setInterval(poll, 1500);
        void poll(); // immediate first read

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [id]);

    return { data, error };
}
