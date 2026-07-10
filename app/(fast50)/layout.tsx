import React from 'react';
import '../(new-layout)/styles/_imports.scss';

export default function Fast50Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div data-bs-theme="dark" style={{ minHeight: '100dvh' }}>
            {children}
        </div>
    );
}
