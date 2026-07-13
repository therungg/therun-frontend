'use client';

import React, { useState } from 'react';
import { clipUploadUrlAction } from '~app/(fast50)/fast50/prep/actions';
import { formatTimeMs } from '~src/components/live/commentary-drawer/format';
import type { PrepFact, PrepSessionData } from '~src/lib/fast50/prep.types';
import { parseTimeInput } from '~src/lib/fast50/time-input';
import styles from './prep-studio.module.scss';

const uploadClip = (
    file: File,
    onProgress: (pct: number) => void,
): Promise<string> =>
    clipUploadUrlAction(file.type, file.size).then(
        ({ uploadUrl, videoUrl }) =>
            new Promise<string>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('PUT', uploadUrl);
                xhr.setRequestHeader('Content-Type', file.type);
                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        onProgress(Math.round((e.loaded / e.total) * 100));
                    }
                };
                xhr.onload = () =>
                    xhr.status >= 200 && xhr.status < 300
                        ? resolve(videoUrl)
                        : reject(new Error(`Upload failed (${xhr.status})`));
                xhr.onerror = () => reject(new Error('Upload failed'));
                xhr.send(file);
            }),
    );

export const InterviewPanel = ({
    data,
    splits,
    onChange,
}: {
    data: PrepSessionData;
    splits: { index: number; name: string }[];
    onChange: (data: PrepSessionData) => void;
}) => {
    const [targetInput, setTargetInput] = useState(
        data.interview.goal?.targetTimeMs
            ? formatTimeMs(data.interview.goal.targetTimeMs)
            : '',
    );
    const [uploadPct, setUploadPct] = useState<number | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [noteSplit, setNoteSplit] = useState(0);
    const [noteText, setNoteText] = useState('');

    const setInterview = (interview: Partial<PrepSessionData['interview']>) =>
        onChange({ ...data, interview: { ...data.interview, ...interview } });

    const targetMs = parseTimeInput(targetInput);

    const onFile = async (file: File | undefined) => {
        if (!file) return;
        if (file.type !== 'video/mp4') {
            setUploadError('mp4 only');
            return;
        }
        setUploadError(null);
        setUploadPct(0);
        try {
            const videoUrl = await uploadClip(file, setUploadPct);
            onChange({
                ...data,
                clips: [
                    ...data.clips,
                    {
                        id: crypto.randomUUID(),
                        videoUrl,
                        title: file.name.replace(/\.mp4$/i, ''),
                    },
                ],
            });
        } catch (e) {
            setUploadError(e instanceof Error ? e.message : 'Upload failed');
        } finally {
            setUploadPct(null);
        }
    };

    return (
        <div className={styles.pane}>
            <div className={styles.paneTitle}>Interview</div>

            <label className={styles.field}>
                What's the goal tonight? (The Called Shot)
                <input
                    type="text"
                    placeholder="e.g. sub 1:40, survive Water Temple"
                    value={data.interview.goal?.text ?? ''}
                    onChange={(e) =>
                        setInterview({
                            goal: e.target.value
                                ? {
                                      text: e.target.value,
                                      targetTimeMs:
                                          data.interview.goal?.targetTimeMs,
                                  }
                                : undefined,
                        })
                    }
                />
            </label>
            <label className={styles.field}>
                Target time (mm:ss or h:mm:ss — optional)
                <input
                    type="text"
                    placeholder="1:40:00"
                    value={targetInput}
                    onChange={(e) => {
                        setTargetInput(e.target.value);
                        const ms = parseTimeInput(e.target.value);
                        if (data.interview.goal) {
                            setInterview({
                                goal: {
                                    text: data.interview.goal.text,
                                    targetTimeMs: ms,
                                },
                            });
                        }
                    }}
                />
                {targetInput && !targetMs ? (
                    <span className={styles.error}>unparseable time</span>
                ) : targetMs ? (
                    <span className={styles.itemMeta}>
                        = {formatTimeMs(targetMs)}
                    </span>
                ) : null}
            </label>

            <div className={styles.paneTitle}>Quotes (Runner's Words)</div>
            {data.interview.quotes.map((q, i) => (
                <div key={q.id} className={styles.itemCard}>
                    <textarea
                        rows={2}
                        value={q.text}
                        onChange={(e) => {
                            const quotes = [...data.interview.quotes];
                            quotes[i] = { ...q, text: e.target.value };
                            setInterview({ quotes });
                        }}
                    />
                    <input
                        type="text"
                        placeholder="Context (e.g. On nerves)"
                        value={q.context ?? ''}
                        onChange={(e) => {
                            const quotes = [...data.interview.quotes];
                            quotes[i] = {
                                ...q,
                                context: e.target.value || undefined,
                            };
                            setInterview({ quotes });
                        }}
                    />
                    <button
                        type="button"
                        className={styles.iconButton}
                        onClick={() =>
                            setInterview({
                                quotes: data.interview.quotes.filter(
                                    (x) => x.id !== q.id,
                                ),
                            })
                        }
                    >
                        remove
                    </button>
                </div>
            ))}
            <button
                type="button"
                className={styles.buttonGhost}
                onClick={() =>
                    setInterview({
                        quotes: [
                            ...data.interview.quotes,
                            { id: crypto.randomUUID(), text: '' },
                        ],
                    })
                }
            >
                + quote
            </button>

            <div className={styles.paneTitle}>Fact cards</div>
            {data.interview.facts.map((f, i) => {
                const update = (patch: Partial<PrepFact>) => {
                    const facts = [...data.interview.facts];
                    facts[i] = { ...f, ...patch };
                    setInterview({ facts });
                };
                return (
                    <div key={f.id} className={styles.itemCard}>
                        <select
                            value={f.template}
                            onChange={(e) =>
                                update({
                                    template: e.target
                                        .value as PrepFact['template'],
                                })
                            }
                        >
                            <option value="fact">Fact</option>
                            <option value="versus">Versus</option>
                            <option value="history">History</option>
                        </select>
                        <input
                            type="text"
                            placeholder="Title / kicker"
                            value={f.title ?? ''}
                            onChange={(e) =>
                                update({ title: e.target.value || undefined })
                            }
                        />
                        <input
                            type="text"
                            placeholder={
                                f.template === 'versus' ? 'Left value' : 'Body'
                            }
                            value={f.body}
                            onChange={(e) => update({ body: e.target.value })}
                        />
                        {f.template === 'versus' ? (
                            <input
                                type="text"
                                placeholder="Right value"
                                value={f.secondary ?? ''}
                                onChange={(e) =>
                                    update({
                                        secondary: e.target.value || undefined,
                                    })
                                }
                            />
                        ) : null}
                        <button
                            type="button"
                            className={styles.iconButton}
                            onClick={() =>
                                setInterview({
                                    facts: data.interview.facts.filter(
                                        (x) => x.id !== f.id,
                                    ),
                                })
                            }
                        >
                            remove
                        </button>
                    </div>
                );
            })}
            <button
                type="button"
                className={styles.buttonGhost}
                onClick={() =>
                    setInterview({
                        facts: [
                            ...data.interview.facts,
                            {
                                id: crypto.randomUUID(),
                                template: 'fact',
                                body: '',
                            },
                        ],
                    })
                }
            >
                + fact
            </button>

            <div className={styles.paneTitle}>Clips (Watch For This)</div>
            {data.clips.map((clip, i) => (
                <div key={clip.id} className={styles.itemCard}>
                    <input
                        type="text"
                        placeholder="Title"
                        value={clip.title}
                        onChange={(e) => {
                            const clips = [...data.clips];
                            clips[i] = { ...clip, title: e.target.value };
                            onChange({ ...data, clips });
                        }}
                    />
                    <input
                        type="text"
                        placeholder="Caption (what to watch for)"
                        value={clip.caption ?? ''}
                        onChange={(e) => {
                            const clips = [...data.clips];
                            clips[i] = {
                                ...clip,
                                caption: e.target.value || undefined,
                            };
                            onChange({ ...data, clips });
                        }}
                    />
                    <video src={clip.videoUrl} controls muted height={120} />
                    <button
                        type="button"
                        className={styles.iconButton}
                        onClick={() =>
                            onChange({
                                ...data,
                                clips: data.clips.filter(
                                    (x) => x.id !== clip.id,
                                ),
                            })
                        }
                    >
                        remove
                    </button>
                </div>
            ))}
            <label className={styles.field}>
                Upload mp4
                <input
                    type="file"
                    accept="video/mp4"
                    onChange={(e) => onFile(e.target.files?.[0])}
                />
                {uploadPct !== null ? (
                    <span className={styles.itemMeta}>
                        uploading… {uploadPct}%
                    </span>
                ) : null}
                {uploadError ? (
                    <span className={styles.error}>{uploadError}</span>
                ) : null}
            </label>

            <div className={styles.paneTitle}>Roadmap notes</div>
            {data.roadmapNotes.map((n) => (
                <div key={n.splitIndex} className={styles.itemCard}>
                    <span className={styles.itemLabel}>
                        {splits.find((s) => s.index === n.splitIndex)?.name ??
                            `split ${n.splitIndex}`}
                    </span>
                    <span className={styles.itemMeta}>{n.text}</span>
                    <button
                        type="button"
                        className={styles.iconButton}
                        onClick={() =>
                            onChange({
                                ...data,
                                roadmapNotes: data.roadmapNotes.filter(
                                    (x) => x.splitIndex !== n.splitIndex,
                                ),
                            })
                        }
                    >
                        remove
                    </button>
                </div>
            ))}
            <div className={styles.row}>
                <select
                    value={noteSplit}
                    onChange={(e) => setNoteSplit(Number(e.target.value))}
                >
                    {splits.map((s) => (
                        <option key={s.index} value={s.index}>
                            {s.name}
                        </option>
                    ))}
                </select>
                <input
                    type="text"
                    placeholder="Note"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                />
                <button
                    type="button"
                    className={styles.buttonGhost}
                    onClick={() => {
                        if (!noteText.trim()) return;
                        onChange({
                            ...data,
                            roadmapNotes: [
                                ...data.roadmapNotes.filter(
                                    (x) => x.splitIndex !== noteSplit,
                                ),
                                {
                                    splitIndex: noteSplit,
                                    text: noteText.trim(),
                                },
                            ],
                        });
                        setNoteText('');
                    }}
                >
                    + note
                </button>
            </div>
        </div>
    );
};
