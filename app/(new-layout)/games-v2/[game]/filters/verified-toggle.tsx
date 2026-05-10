'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

interface Props {
    verified: boolean;
}

export function VerifiedToggle({ verified }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const onChange = (next: boolean) => {
        const sp = new URLSearchParams(searchParams.toString());
        if (next) sp.set('verified', 'true');
        else sp.delete('verified');
        sp.delete('page');
        startTransition(() => {
            router.push(`${pathname}?${sp.toString()}`);
        });
    };

    return (
        <label className="d-flex align-items-center gap-2 mb-3">
            <input
                type="checkbox"
                checked={verified}
                disabled={isPending}
                onChange={(e) => onChange(e.target.checked)}
            />
            <span>Verified runs only</span>
        </label>
    );
}
