import { useEffect, RefObject } from "react";
import styles from "./hearts.module.scss";

interface UseGlowAnimationProps {
    heartRef: RefObject<HTMLElement>;
    containerRef: RefObject<HTMLElement>;
    shouldShowHearts: boolean;
}

const createHeart = ({ width, index }: { width: number; index: number }) => {
    const heart = document.createElement("div");
    heart.classList.add(styles.heart);
    heart.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`;
    const heartAnimationConfiguration = {
        id: index,
        x: Math.random() * width,
        y: -20,
        speed: 0.7 + Math.random() * 1.2, // Varying speeds from 0.5 to 2
        scale: 0.8 + Math.random() * 0.8, // Random sizes from 0.8x to 1.6x
        wobble: Math.random() * 2 - 1,
        active: false,
    };
    return { element: heart, configuration: heartAnimationConfiguration };
};

const POOL_SIZE = 15;

export const useHeartsAnimation = ({
    heartRef,
    containerRef,
    shouldShowHearts,
}: UseGlowAnimationProps) => {
    useEffect(() => {
        if (!shouldShowHearts || !heartRef?.current || !containerRef?.current) {
            return;
        }
        containerRef.current.classList.add(styles.heartbeatContainer);
        heartRef.current.classList.add(styles.heartContainer);
        const rect = containerRef.current!.getBoundingClientRect();
        const heartPool = Array.from({ length: POOL_SIZE }, (_, i) =>
            createHeart({ width: rect.width, index: i }),
        );
        for (const heart of heartPool) {
            heartRef.current.appendChild(heart.element);
        }

        let lastHeartTime = 0;
        let animationFrame: ReturnType<typeof requestAnimationFrame>;
        const animate = (timestamp: number): void => {
            // Add new hearts periodically
            if (timestamp - lastHeartTime > 200) {
                const pendingHeart = heartPool.find(
                    ({ configuration }) => !configuration.active,
                );
                if (!pendingHeart) {
                    setTimeout(animate, 100);
                    return;
                }

                pendingHeart.configuration.active = true;
                pendingHeart.configuration.x = Math.random() * rect.width;
                pendingHeart.configuration.y = -20;
                lastHeartTime = timestamp;
                pendingHeart.element.style.display = "block";
            }

            // Update heart positions
            heartPool.forEach(({ configuration, element }) => {
                if (!configuration.active) return;

                configuration.y += configuration.speed;
                configuration.x +=
                    Math.sin(configuration.y * 0.1) * configuration.wobble;
                // Reset heart if it's gone off-screen
                if (configuration.y > rect.height) {
                    configuration.active = false;
                    configuration.y = -20;
                    element.style.display = "none";
                } else {
                    element.style.transform = `translate(${configuration.x}px, ${configuration.y}px) scale(${configuration.scale})`;
                }
            });

            animationFrame = requestAnimationFrame(animate);
        };

        animationFrame = requestAnimationFrame(animate);

        return () => {
            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
            }
            // Clean up heart elements
            heartPool.forEach(({ element }) => element.remove());
        };
    }, [containerRef, shouldShowHearts, heartRef]);
};
