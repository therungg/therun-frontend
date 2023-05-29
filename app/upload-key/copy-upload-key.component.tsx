"use client";
import React from "react";
import uploadKeyStyles from "../../src/components/css/UploadKey.module.scss";
import { Copy } from "./copy.component";

interface CopyUploadKeyProps {
    uploadKey: string;
}

export const CopyUploadKey: React.FunctionComponent<CopyUploadKeyProps> = ({
    uploadKey,
}) => {
    const [isUploadKeyVisible, setIsUploadKeyVisible] = React.useState(false);
    const [isCopied, setIsCopied] = React.useState(false);

    return isUploadKeyVisible ? (
        <CopyUploadKeyButton
            isCopied={isCopied}
            setIsCopied={setIsCopied}
            uploadKey={uploadKey}
        />
    ) : (
        <DisplayUploadKeyButton setIsUploadKeyVisible={setIsUploadKeyVisible} />
    );
};

interface CopyUploadKeyButtonProps {
    uploadKey: string;
    isCopied: boolean;
    setIsCopied: React.Dispatch<React.SetStateAction<boolean>>;
}

const CopyUploadKeyButton: React.FunctionComponent<
    CopyUploadKeyButtonProps
> = ({ uploadKey, isCopied, setIsCopied }) => {
    return (
        <div className={uploadKeyStyles.uploadKeyBox}>
            {uploadKey}
            <div
                className={uploadKeyStyles.uploadKey}
                onClick={async () => {
                    await navigator.clipboard.writeText(uploadKey);
                    setIsCopied(true);
                    setTimeout(() => {
                        setIsCopied(false);
                    }, 1500);
                }}
            >
                <Copy />
            </div>
            {isCopied && (
                <div className={uploadKeyStyles.copied}>
                    Copied to Clipboard!
                </div>
            )}
        </div>
    );
};

interface DisplayUploadKeyButtonProps {
    setIsUploadKeyVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

const DisplayUploadKeyButton: React.FunctionComponent<
    DisplayUploadKeyButtonProps
> = ({ setIsUploadKeyVisible }) => {
    return (
        <div
            style={{ cursor: "pointer" }}
            onClick={() => setIsUploadKeyVisible(true)}
        >
            Click to show Upload Key
        </div>
    );
};
