// Discord invite codes are alphanumeric plus - and _ (vanity URLs included).
const INVITE_CODE = /^[A-Za-z0-9_-]{2,64}$/;

// Host is case-insensitive (phones capitalise the first letter of a pasted
// "Discord.gg/…"); ptb./canary. are Discord's beta clients; discord.gg/invite/
// is a form people type by analogy with discord.com/invite/.
const INVITE_URL =
    /^(?:https?:\/\/)?(?:www\.|ptb\.|canary\.)?(?:discord\.gg(?:\/invite)?|discord(?:app)?\.com\/invite|discord\.com\/friend-invite)\/([A-Za-z0-9_-]{2,64})\/?(?:[?#].*)?$/i;

// Zero-width characters ride along when an invite is copied out of some apps.
const INVISIBLE = /[​-‍⁠﻿]/g;

/**
 * Accepts a full invite URL (any of the discord.gg / discord.com/invite
 * variants, with or without scheme) or a bare invite code, and returns the
 * canonical `https://discord.gg/<code>` form. Returns null if the input is
 * not a recognisable invite.
 */
export function normalizeDiscordInvite(input: string): string | null {
    // <…> is how Discord messages suppress a link embed.
    const value = input
        .replace(INVISIBLE, '')
        .trim()
        .replace(/^<(.*)>$/, '$1')
        .trim();
    if (!value) return null;

    const match = INVITE_URL.exec(value);
    if (match) return `https://discord.gg/${match[1]}`;

    if (INVITE_CODE.test(value)) return `https://discord.gg/${value}`;

    return null;
}
