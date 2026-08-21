'use client';

import { useState, useTransition } from 'react';
import TimezoneSelect from 'react-timezone-select';
import {
    FormSection,
    InlineError,
    SectionFooter,
} from '~app/(new-layout)/games-v2/[game]/manage/shared/form-kit';
import { updateProfile } from '~src/actions/update-profile.action';
import { countries } from '~src/common/countries';
import { Button } from '~src/components/Button/Button';
import type { UserData } from '~src/lib/get-session-data';
import { NO_COUNTRY, type ProfileInput } from '~src/lib/profile-schema';
import styles from './profile-form.module.scss';

export function ProfileForm({ initial }: { initial: UserData }) {
    const [form, setForm] = useState<ProfileInput>({
        pronouns: initial.pronouns ?? '',
        aka: initial.aka ?? '',
        country: initial.country || NO_COUNTRY,
        timezone:
            initial.timezone ||
            Intl.DateTimeFormat().resolvedOptions().timeZone,
        bio: initial.bio ?? '',
        socials: {
            youtube: initial.socials?.youtube ?? '',
            twitter: initial.socials?.twitter ?? '',
            bluesky: initial.socials?.bluesky ?? '',
        },
    });
    const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const set = <K extends keyof ProfileInput>(k: K, v: ProfileInput[K]) => {
        setStatus('idle');
        setForm((f) => ({ ...f, [k]: v }));
    };
    const setSocial = (k: 'youtube' | 'twitter' | 'bluesky', v: string) => {
        setStatus('idle');
        setForm((f) => ({ ...f, socials: { ...f.socials, [k]: v } }));
    };

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
            const r = await updateProfile(form);
            if (r.ok) setStatus('saved');
            else {
                setStatus('error');
                setError(r.error);
            }
        });
    };

    return (
        <form onSubmit={onSubmit} className={styles.form}>
            <FormSection title="About you">
                <div className={styles.grid}>
                    <label className={styles.field}>
                        <span>Pronouns</span>
                        <input
                            value={form.pronouns}
                            maxLength={50}
                            placeholder="they/them"
                            onChange={(e) => set('pronouns', e.target.value)}
                        />
                    </label>
                    <label className={styles.field}>
                        <span>Also known as</span>
                        <input
                            value={form.aka}
                            maxLength={25}
                            onChange={(e) => set('aka', e.target.value)}
                        />
                    </label>
                    <label className={styles.field}>
                        <span>Country</span>
                        <select
                            value={form.country}
                            onChange={(e) => set('country', e.target.value)}
                        >
                            <option value={NO_COUNTRY}>{NO_COUNTRY}</option>
                            {Object.entries(countries()).map(([code, name]) => (
                                <option key={code} value={code}>
                                    {name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className={styles.field}>
                        <span>Timezone</span>
                        <TimezoneSelect
                            className="timeZoneSelect"
                            value={form.timezone ?? ''}
                            onChange={(tz) => set('timezone', tz.value)}
                        />
                    </label>
                    <label className={`${styles.field} ${styles.full}`}>
                        <span>About (max. 100 characters)</span>
                        <textarea
                            value={form.bio}
                            maxLength={100}
                            rows={3}
                            onChange={(e) => set('bio', e.target.value)}
                        />
                    </label>
                </div>
            </FormSection>

            <FormSection title="Socials" lede="Paste a link or a handle.">
                <div className={styles.grid}>
                    <label className={styles.field}>
                        <span>YouTube</span>
                        <input
                            value={form.socials?.youtube}
                            maxLength={100}
                            placeholder="youtube.com/…"
                            onChange={(e) =>
                                setSocial('youtube', e.target.value)
                            }
                        />
                    </label>
                    <label className={styles.field}>
                        <span>Twitter</span>
                        <input
                            value={form.socials?.twitter}
                            maxLength={100}
                            placeholder="twitter.com/…"
                            onChange={(e) =>
                                setSocial('twitter', e.target.value)
                            }
                        />
                    </label>
                    <label className={styles.field}>
                        <span>Bluesky</span>
                        <input
                            value={form.socials?.bluesky}
                            maxLength={100}
                            placeholder="bsky.app/profile/…"
                            onChange={(e) =>
                                setSocial('bluesky', e.target.value)
                            }
                        />
                    </label>
                </div>
            </FormSection>

            <SectionFooter>
                <Button type="submit" disabled={pending}>
                    {pending ? 'Saving…' : 'Save changes'}
                </Button>
                {status === 'saved' && <span role="status">Saved.</span>}
                {status === 'error' && error && (
                    <InlineError>{error}</InlineError>
                )}
            </SectionFooter>
        </form>
    );
}
