'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useTransition } from 'react';
import type { VariableDef } from '../../../../../types/leaderboards.types';

interface Props {
    def: VariableDef;
    selectedValues: string[];
    isOpen: boolean;
    onOpen: () => void;
    onClose: () => void;
}

export function VariablePill({
    def,
    selectedValues,
    isOpen,
    onOpen,
    onClose,
}: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(e.target as Node)
            ) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen, onClose]);

    const setValues = (next: string[]) => {
        const sp = new URLSearchParams(searchParams.toString());
        if (next.length === 0) sp.delete(def.nameNormalized);
        else sp.set(def.nameNormalized, next.join(','));
        sp.delete('page');
        startTransition(() => {
            router.push(`${pathname}?${sp.toString()}`);
        });
    };

    const toggle = (v: string) => {
        const has = selectedValues.includes(v);
        setValues(
            has
                ? selectedValues.filter((x) => x !== v)
                : [...selectedValues, v],
        );
    };

    const label =
        selectedValues.length === 0
            ? def.name
            : `${def.name}: ${selectedValues.join(', ')}`;

    return (
        <div className="position-relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => (isOpen ? onClose() : onOpen())}
                disabled={isPending}
                className={`btn btn-sm ${selectedValues.length > 0 ? 'btn-primary' : 'btn-outline-secondary'}`}
            >
                {label}
            </button>
            {isOpen && (
                <div
                    className="position-absolute mt-1 p-2 border rounded bg-body shadow-sm"
                    style={{ zIndex: 10, minWidth: '12rem' }}
                >
                    {def.values.map((bucket, idx) => {
                        const canonical = bucket[0];
                        return (
                            <label
                                key={`${def.nameNormalized}-${idx}`}
                                className="d-block"
                                title={
                                    bucket.length > 1
                                        ? `Aliases: ${bucket.slice(1).join(', ')}`
                                        : undefined
                                }
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedValues.includes(canonical)}
                                    onChange={() => toggle(canonical)}
                                    className="me-1"
                                />
                                {canonical}
                            </label>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
