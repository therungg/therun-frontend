import React, { Suspense } from 'react';
import { Demo } from './demo';

export const metadata = {
    robots: { index: false, follow: false },
};

export default function DemoPage() {
    return (
        <Suspense>
            <Demo />
        </Suspense>
    );
}
