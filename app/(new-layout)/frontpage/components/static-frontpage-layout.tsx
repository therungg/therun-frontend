'use client';

import React, { ReactNode, useMemo } from 'react';
import { PanelConfig, PanelId } from '../../../../types/frontpage-config.types';

interface StaticFrontpageLayoutProps {
    initialConfig: PanelConfig;
    panels: Record<PanelId, ReactNode>;
}

export const StaticFrontpageLayout: React.FC<StaticFrontpageLayoutProps> = ({
    initialConfig,
    panels,
}) => {
    const leftPanels = useMemo(
        () =>
            initialConfig.panels
                .filter((p) => p.column === 'left' && p.visible)
                .sort((a, b) => a.order - b.order),
        [initialConfig.panels],
    );

    const rightPanels = useMemo(
        () =>
            initialConfig.panels
                .filter((p) => p.column === 'right' && p.visible)
                .sort((a, b) => a.order - b.order),
        [initialConfig.panels],
    );

    return (
        <div className="row d-flex flex-wrap">
            <div className="col col-lg-6 col-xl-7 col-12">
                {leftPanels.map((panel) => (
                    <div key={panel.id}>{panels[panel.id]}</div>
                ))}
            </div>
            <div className="col col-lg-6 col-xl-5 col-12">
                {rightPanels.map((panel) => (
                    <div key={panel.id}>{panels[panel.id]}</div>
                ))}
            </div>
        </div>
    );
};
