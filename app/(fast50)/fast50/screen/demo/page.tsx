import React, { Suspense } from 'react';
import { Demo } from './demo';

export default function DemoPage() {
    return (
        <Suspense>
            <Demo />
        </Suspense>
    );
}
