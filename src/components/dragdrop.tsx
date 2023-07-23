"use client";
import Dropzone, { useDropzone } from "react-dropzone";
import { upload } from "./fileupload/upload";
import React, { CSSProperties, useMemo, useState } from "react";
import { Alert } from "react-bootstrap";
import { UserLink } from "./links/links";
import Link from "next/link";
import styles from "./css/Dragdrop.module.scss";
import { CheckCircle, CloudUpload } from "react-bootstrap-icons";

export const Dragdrop = ({
    sessionId,
    username,
}: {
    sessionId: string;
    username: string;
}) => {
    const acceptFiles = async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        const reader = new FileReader();

        reader.onload = async () => {
            const binaryString: string = reader.result as string;

            await upload(file, binaryString, sessionId);
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
                <a href={"/upload-key"}>Check out how to here. </a>
            </p>

            {show ? (
                <Alert
                    variant="success"
                    onClose={() => setShow(false)}
                    dismissible
                >
                    <Alert.Heading>
                        <div style={{ display: "flex" }}>
                            <span className={`${styles.uploadSucceeded}`}>
                                <CheckCircle size={18} />
                            </span>
                            Upload succeeded!
                        </div>
                    </Alert.Heading>
                    <p>
                        Check back on{" "}
                        <UserLink username={username}>Your profile</UserLink> in
                        around 1 minute. If your splits don{"'"}t show up or
                        there seems to be something wrong with them, please{" "}
                        <Link href="/contact">Contact me!</Link>
                    </p>
                </Alert>
            ) : (
                <></>
            )}

            <Dropzone onDrop={acceptFiles} multiple={false} accept={".lss"}>
                {({ getRootProps, getInputProps }) => (
                    <section>
                        <div
                            className={styles.dragbox}
                            {...getRootProps({ style })}
                        >
                            <input {...getInputProps()} />
                            <div style={{ height: "20rem" }}>
                                <p className={styles.title}>
                                    Drag .lss file here or click to select one.
                                </p>
                                <div>
                                    <span className={`${styles.uploadFile}`}>
                                        <CloudUpload size={18} />
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
