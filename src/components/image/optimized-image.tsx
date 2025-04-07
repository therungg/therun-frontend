import Image from "next/image";
import { FC } from "react";

export const OptimizedImage: FC<{
    src: string;
    width: number;
    height: number;
    alt: string;
    className?: string;
}> = ({ src, width, height, alt, className = "" }) => {
    const style = { paddingBottom: `min(350px, ${100 / (width / height)}%)` };
    return (
        <div className="next-image-wrapper" style={style}>
            <Image
                style={{
                    position: "relative",
                }}
                alt={alt}
                className={"next-image" + className}
                src={src}
                layout="fill"
                objectFit="contain"
            />
        </div>
    );
};
