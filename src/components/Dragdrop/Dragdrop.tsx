"use client";
import React, { CSSProperties, useMemo, useState } from "react";
import Dropzone, { useDropzone } from "react-dropzone";
import { Alert } from "react-bootstrap";
import { CheckCircle, CloudUpload } from "react-bootstrap-icons";
import Link from "next/link";
import { useUploadMutation } from "./upload";
import { UserLink } from "../links/links";

export const Dragdrop = ({
    sessionId,
    username,
}: {
    sessionId: string;
    username: string;
}) => {
    const { trigger: uploadFile } = useUploadMutation();
    const acceptFiles = async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        const reader = new FileReader();

        reader.onload = async () => {
            const binaryString: string = reader.result as string;

            await uploadFile({
                file,
                contents: binaryString,
                sessionId,
            });
        };

        reader.readAsText(file);
        setShow(true);
    };

    const { isFocused, isDragAccept, isDragReject } = useDropzone({
        accept: "image/*",
    });

    const style: CSSProperties = useMemo(() => {
        const baseStyle = {
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "20px",
            borderWidth: 2,
            borderRadius: 2,
            borderStyle: "dashed",
            outline: "none",
            transition: "border .24s ease-in-out",
        };

        const focusedStyle = {
            borderColor: "#2196f3",
        };

        const acceptStyle = {
            borderColor: "#00e676",
        };

        const rejectStyle = {
            borderColor: "#ff1744",
        };

        return {
            ...baseStyle,
            ...(isFocused ? focusedStyle : {}),
            ...(isDragAccept ? acceptStyle : {}),
            ...(isDragReject ? rejectStyle : {}),
        };
    }, [isFocused, isDragAccept, isDragReject]) as CSSProperties;

    const [show, setShow] = useState(false);

    return (
        <div>
            <h2>Splits Upload</h2>

            <p>
                Make sure both the Game and Category field are filled in in your
                Livesplit settings!
            </p>

            <p>
                If you install the LiveSplit Component, you will never have to
                upload manually again!{" "}
                <a href="/livesplit">Check out how to here. </a>
            </p>

            {show ? (
                <Alert
                    variant="success"
                    onClose={() => setShow(false)}
                    dismissible
                >
                    <Alert.Heading className="d-flex align-items-center flex-nowrap column-gap-2">
                        <CheckCircle size={18} />
                        Upload succeeded!
                    </Alert.Heading>
                    <p>
                        Check back on{" "}
                        <UserLink username={username}>Your profile</UserLink> in
                        around 1 minute. If your splits don&apos;t show up or
                        there seems to be something wrong with them, please{" "}
                        <Link href="/contact" prefetch={false}>Contact me!</Link>
                    </p>
                </Alert>
            ) : (
                <></>
            )}

            <Dropzone onDrop={acceptFiles} multiple={false} accept=".lss">
                {({ getRootProps, getInputProps }) => (
                    <section>
                        <div
                            className="cursor-pointer bg-body-secondary "
                            {...getRootProps({ style })}
                        >
                            <input {...getInputProps()} />
                            <div className="h-320p">
                                <p className="fs-responsive-larger fw-bolder text-center">
                                    Drag .lss file here or click to select one.
                                </p>
                                <div>
                                    <span className="d-flex align-items-center justify-content-center text-body-tertiary text-center p-3">
                                        <CloudUpload size={220} />
                                    </span>
                                </div>
                            </div>
                        </div>
                    </section>
                )}
            </Dropzone>
        </div>
    );
};
