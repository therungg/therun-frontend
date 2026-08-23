import { z } from 'zod';
import { countries } from '~src/common/countries';

export const NO_COUNTRY = 'Show no country';

const handle = z.string().trim().max(100).optional();

export const profileSchema = z.object({
    pronouns: z.string().trim().max(50).optional(),
    aka: z.string().trim().max(25).optional(),
    country: z
        .string()
        .trim()
        .optional()
        .transform((v) => (v === NO_COUNTRY ? '' : (v ?? '')))
        .refine((v) => v === '' || v in countries(), 'Unknown country'),
    timezone: z.string().trim().max(100).optional(),
    bio: z.string().trim().max(100).optional(),
    socials: z
        .object({ youtube: handle, twitter: handle, bluesky: handle })
        .optional(),
});

export type ProfileInput = z.input<typeof profileSchema>;
export type ProfilePayload = z.output<typeof profileSchema>;

/** Users paste URLs; the backend stores bare handles (matches the old form). */
export function normaliseHandle(kind: 'youtube' | 'twitter', value: string) {
    if (kind === 'twitter') {
        const parts = value.split('.com/');
        return parts[parts.length - 1];
    }
    let parts = value.split('.com/');
    if (parts.length === 1) parts = parts[0].split('.be/');
    return parts[parts.length - 1];
}
