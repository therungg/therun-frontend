import Image from "next/image";
import { FC, HTMLAttributes, PropsWithChildren } from "react";

interface PanelInterface extends HTMLAttributes<HTMLDivElement> {
    imageUrl: string;
    imageAlt: string;
}

export const CardWithImage: FC<PropsWithChildren<PanelInterface>> = ({
    imageUrl,
    imageAlt,
    children,
    ...props
}) => {
    return (
        <div
            {...props}
            className={
                "border rounded-3 bg-body-secondary px-2 py-2 d-flex " +
                    props.className || ""
            }
        >
            <div style={{ width: 70, height: 80, position: "relative" }}>
                <Image
                    src={imageUrl}
                    fill
                    style={{
                        objectFit: "contain",
                    }}
                    alt={imageAlt}
                />
            </div>
            <div className="ms-3">{children}</div>
        </div>
    );
};
