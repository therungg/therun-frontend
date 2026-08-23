'use client';

import { hasFlag } from 'country-flag-icons';
import { Youtube } from 'react-bootstrap-icons';
import { countries } from '~src/common/countries';
import { NO_COUNTRY, type ProfileInput } from '~src/lib/profile-schema';
import styles from './profile-form.module.scss';

/**
 * "How you appear" — a live mirror of the profile form. Static identity
 * (avatar, username) comes from the session; everything else reflects the
 * form state as it's edited, so changes have a visible consequence instead
 * of editing into a void.
 */
export function ProfilePreview({
    username,
    picture,
    form,
}: {
    username: string;
    picture?: string;
    form: ProfileInput;
}) {
    const country =
        form.country && form.country !== NO_COUNTRY ? form.country : undefined;
    const countryName =
        country && (countries() as Record<string, string>)[country];
    const socials = [
        form.socials?.youtube && {
            label: 'YouTube',
            value: form.socials.youtube,
        },
        form.socials?.twitter && {
            label: 'Twitter',
            value: form.socials.twitter,
        },
        form.socials?.bluesky && {
            label: 'Bluesky',
            value: form.socials.bluesky,
        },
    ].filter(Boolean) as { label: string; value: string }[];

    return (
        <div className={styles.previewWrap}>
            <div className={styles.previewLabel}>How you appear</div>
            <div className={styles.previewCard}>
                <div className={styles.previewTop}>
                    {picture ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            className={styles.previewAvatar}
                            src={picture}
                            alt=""
                            width={48}
                            height={48}
                        />
                    ) : (
                        <span
                            className={styles.previewAvatar}
                            data-fallback
                            aria-hidden="true"
                        >
                            {username.charAt(0)}
                        </span>
                    )}
                    <div className={styles.previewIdent}>
                        <div className={styles.previewName}>
                            {username}
                            {form.aka && (
                                <span className={styles.previewAka}>
                                    {form.aka}
                                </span>
                            )}
                        </div>
                        <div className={styles.previewSub}>
                            {country && hasFlag(country) && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    className={styles.previewFlag}
                                    alt={countryName || country}
                                    src={`https://raw.githubusercontent.com/hampusborgos/country-flags/main/svg/${country.toLowerCase()}.svg`}
                                />
                            )}
                            {countryName && <span>{countryName}</span>}
                            {form.pronouns && (
                                <span className={styles.previewPronouns}>
                                    {form.pronouns}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {form.bio && <p className={styles.previewBio}>{form.bio}</p>}

                {socials.length > 0 && (
                    <div className={styles.previewSocials}>
                        {socials.map((s) => (
                            <span key={s.label} className={styles.previewChip}>
                                {s.label === 'YouTube' && (
                                    <Youtube size={12} aria-hidden />
                                )}
                                {s.label}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
