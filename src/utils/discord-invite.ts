// Discord invite codes are alphanumeric plus - and _ (vanity URLs included).
const INVITE_CODE = /^[A-Za-z0-9_-]{2,64}$/;

const INVITE_URL =
    /^(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord(?:app)?\.com\/invite|discord\.com\/friend-invite)\/([A-Za-z0-9_-]{2,64})\/?(?:[?#].*)?$/;

/**
 * Accepts a full invite URL (any of the discord.gg / discord.com/invite
 * variants, with or without scheme) or a bare invite code, and returns the
 * canonical `https://discord.gg/<code>` form. Returns null if the input is
 * not a recognisable invite.
 */
export function normalizeDiscordInvite(input: string): string | null {
    const value = input.trim();
    if (!value) return null;

    const match = INVITE_URL.exec(value);
    if (match) return `https://discord.gg/${match[1]}`;

    if (INVITE_CODE.test(value)) return `https://discord.gg/${value}`;

    return null;
}
