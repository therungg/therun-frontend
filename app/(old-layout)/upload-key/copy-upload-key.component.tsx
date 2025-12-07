"use client";
import React from "react";
import { Clipboard } from "react-bootstrap-icons";

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
        <div className="d-flex align-items-center justify-content-center column-gap-3">
            {uploadKey}
            <div
                onClick={async () => {
                    await navigator.clipboard.writeText(uploadKey);
                    setIsCopied(true);
                    setTimeout(() => {
                        setIsCopied(false);
                    }, 1500);
                }}
            >
                <Clipboard className="cursor-pointer" size={36} />
            </div>
            {isCopied && <div className="fs-large">Copied to Clipboard!</div>}
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
            className="cursor-pointer"
            onClick={() => setIsUploadKeyVisible(true)}
        >
            Click to show LiveSplit Key
        </div>
    );
};
