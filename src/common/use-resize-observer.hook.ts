import { useState, useEffect } from "react";

export const useResizeObserver = (container: HTMLElement | null) => {
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    useEffect(() => {
        if (!container) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerSize({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height,
                });
            }
        });

        observer.observe(container);

        return () => {
            observer.disconnect();
        };
    }, [container]);
    return containerSize;
};
