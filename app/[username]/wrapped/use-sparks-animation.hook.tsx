import { useEffect, RefObject } from "react";
import gsap from "gsap";

interface UseGlowAnimationProps {
    sparkRef: RefObject<HTMLElement>;
    containerRef: RefObject<HTMLElement>;
    shouldShowSparks: boolean;
}

export const useSparksAnimation = ({
    sparkRef,
    containerRef,
    shouldShowSparks,
}: UseGlowAnimationProps) => {
    useEffect(() => {
        if (!shouldShowSparks || !sparkRef.current || !containerRef.current) {
            return;
        }

        const createSpark = () => {
            const spark = document.createElement("div");
            spark.className = "position-absolute";

            // Randomize ember sizes
            const size = 2 + Math.random() * 3;
            spark.style.width = `${size}px`;
            spark.style.height = `${size}px`;

            // Create ember-like colors
            const colors = [
                "#FF4500",
                "#FF6B00",
                "#FF8C00",
                "#FFD700",
                "#FFFFE0",
                "#FFF5E1",
            ];
            const color = colors[Math.floor(Math.random() * colors.length)];
            spark.style.backgroundColor = color;
            spark.style.borderRadius = "50%";
            spark.style.boxShadow = `0 0 ${size * 2}px ${color}`;
            sparkRef.current!.appendChild(spark);

            const rect = containerRef.current!.getBoundingClientRect();
            const startX = Math.random() * rect.width;
            const startY = rect.height;

            gsap.set(spark, { x: startX, y: startY });

            gsap.to(spark, {
                x: startX + (Math.random() - 0.5) * 200, // Increase horizontal randomness
                y: startY - 300 - Math.random() * 300,
                rotation: Math.random() * 360, // Optional rotation for dynamic movement
                scale: Math.random() * 0.8 + 0.3,
                opacity: 0,
                duration: 2 + Math.random() * 1,
                ease: "sine.inOut",
                onComplete: () => {
                    spark.remove();
                },
            });
        };

        const glowAnimation = gsap.fromTo(
            containerRef.current,
            { boxShadow: "0 0 20px #FF6B00" },
            {
                boxShadow: "0 0 30px #FF4500",
                repeat: -1,
                yoyo: true,
                duration: 1.5,
                ease: "sine.inOut",
            },
        );

        const interval = setInterval(() => {
            for (let i = 0; i < 3; i++) {
                createSpark();
            }
        }, 50);

        return () => {
            clearInterval(interval);
            glowAnimation.kill();
        };
    }, [containerRef, shouldShowSparks, sparkRef]);
};
