'use client';
import React, { useState } from 'react';
import { CheckCircle, CloudUpload } from 'react-bootstrap-icons';
import Dropzone from 'react-dropzone';
import Link from '~src/components/link';
import { UserLink } from '../links/links';
import styles from './dragdrop.module.scss';
import { useUploadMutation } from './upload';

export const Dragdrop = ({
    sessionId,
    username,
}: {
    sessionId: string;
    username: string;
}) => {
    const { trigger: uploadFile } = useUploadMutation();
    const [show, setShow] = useState(false);

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

    return (
        <div>
            {show && (
                <div className={styles.successCard}>
                    <CheckCircle size={20} className={styles.successIcon} />
                    <div>
                        <div className={styles.successTitle}>
                            Upload succeeded!
                        </div>
                        <div className={styles.successBody}>
                            Check back on{' '}
                            <UserLink username={username}>
                                your profile
                            </UserLink>{' '}
                            in about a minute. If your splits don&apos;t show up
                            or something seems wrong, please{' '}
                            <Link href="/contact">contact us</Link>.
                        </div>
                    </div>
                    <button
                        type="button"
                        className={styles.dismissBtn}
                        onClick={() => setShow(false)}
                        aria-label="Dismiss"
                    >
                        ×
                    </button>
                </div>
            )}

            <Dropzone
                onDrop={acceptFiles}
                multiple={false}
                accept={{ 'application/xml': ['.lss'] }}
            >
                {({
                    getRootProps,
                    getInputProps,
                    isFocused,
                    isDragAccept,
                    isDragReject,
                }) => (
                    <div
                        {...getRootProps({
                            className: [
                                styles.dropzone,
                                isFocused && styles.dropzoneFocused,
                                isDragAccept && styles.dropzoneAccept,
                                isDragReject && styles.dropzoneReject,
                            ]
                                .filter(Boolean)
                                .join(' '),
                        })}
                    >
                        <input {...getInputProps()} />
                        <CloudUpload size={64} className={styles.icon} />
                        <div className={styles.label}>
                            Drop your .lss file here
                        </div>
                        <div className={styles.hint}>or click to browse</div>
                        <div className={styles.requirement}>
                            Make sure Game and Category fields are set in
                            LiveSplit
                        </div>
                    </div>
                )}
            </Dropzone>
        </div>
    );
};
