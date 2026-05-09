'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { VariableDef } from '../../../../../types/leaderboards.types';

interface Props {
    def: VariableDef;
    selectedValues: string[];
}

export function VariablePill({ def, selectedValues }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [open, setOpen] = useState(false);

    const setValues = (next: string[]) => {
        const sp = new URLSearchParams(searchParams.toString());
        if (next.length === 0) sp.delete(`var_${def.name}`);
        else sp.set(`var_${def.name}`, next.join(','));
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
            ? def.display
            : `${def.display}: ${selectedValues.join(', ')}`;

    return (
        <div className="position-relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                disabled={isPending}
                className={`btn btn-sm ${selectedValues.length > 0 ? 'btn-primary' : 'btn-outline-secondary'}`}
            >
                {label}
            </button>
            {open && (
                <div
                    role="dialog"
                    className="position-absolute mt-1 p-2 border rounded bg-body shadow-sm"
                    style={{ zIndex: 10, minWidth: '12rem' }}
                >
                    {def.values.map((v) => (
                        <label key={v} className="d-block">
                            <input
                                type="checkbox"
                                checked={selectedValues.includes(v)}
                                onChange={() => toggle(v)}
                                className="me-1"
                            />
                            {v}
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
}
