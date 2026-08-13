// The keystroke model behind DurationField, kept pure and separate from the
// component so it can be tested as a table of keystrokes rather than through
// a rendered input.
//
// Draft state is a digit buffer, not a number, because `0:04` and `4` are
// distinct typing states that both mean 4000ms. Digits fill from the right;
// the decimal key switches to the fraction. See
// docs/plans/2026-08-13-duration-field-design.md.

export interface DurationDraft {
    /** The h/m/s stack, right-aligned: '3548' is 35:48. */
    digits: string;
    /** Fraction digits as typed, 0-3 of them. '6' means 600ms. */
    frac: string;
    /** True once the decimal key was pressed, even before a digit follows. */
    inFrac: boolean;
}

export const EMPTY_DRAFT: DurationDraft = {
    digits: '',
    frac: '',
    inFrac: false,
};

/** hhh:mm:ss — past this, further digits are ignored rather than silently lost. */
const MAX_DIGITS = 7;
const MAX_FRAC = 3;

const pad = (n: number | string, w: number) => String(n).padStart(w, '0');

export function isEmptyDraft(d: DurationDraft): boolean {
    return d.digits === '' && d.frac === '' && !d.inFrac;
}

export function applyDigit(d: DurationDraft, ch: string): DurationDraft {
    if (d.inFrac) {
        if (d.frac.length >= MAX_FRAC) return d;
        return { ...d, frac: d.frac + ch };
    }
    if (d.digits.length >= MAX_DIGITS) return d;
    // A lone leading zero carries no information in a right-filling stack, so
    // typing 0 then 4 gives 4 seconds rather than a stuck '04'.
    const digits = d.digits === '0' ? ch : d.digits + ch;
    return { ...d, digits };
}

export function applyDecimal(d: DurationDraft): DurationDraft {
    return { ...d, inFrac: true };
}

export function applyBackspace(d: DurationDraft): DurationDraft {
    if (d.inFrac && d.frac.length > 0) {
        return { ...d, frac: d.frac.slice(0, -1) };
    }
    // Backing out of an empty fraction crosses back into the seconds.
    if (d.inFrac) return { ...d, frac: '', inFrac: false };
    return { digits: d.digits.slice(0, -1), frac: '', inFrac: false };
}

/**
 * The value the draft means, always normalized: `0:95` is 95 000ms, so no
 * caller ever sees an over-60 segment. Null only for a wholly empty draft.
 */
export function draftToMs(d: DurationDraft): number | null {
    if (isEmptyDraft(d)) return null;
    const s = Number(d.digits.slice(-2) || 0);
    const m = Number(d.digits.slice(-4, -2) || 0);
    const h = Number(d.digits.slice(0, -4) || 0);
    const frac = d.frac === '' ? 0 : Number(d.frac.padEnd(MAX_FRAC, '0'));
    return ((h * 60 + m) * 60 + s) * 1000 + frac;
}

/** The normalized draft for a value — what the field settles to on blur. */
export function msToDraft(ms: number | null | undefined): DurationDraft {
    if (ms == null) return EMPTY_DRAFT;
    const total = Math.max(0, Math.round(ms));
    const millis = total % 1000;
    const seconds = Math.floor(total / 1000);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    let digits: string;
    if (h > 0) digits = `${h}${pad(m, 2)}${pad(s, 2)}`;
    else if (m > 0) digits = `${m}${pad(s, 2)}`;
    else digits = pad(s, 2);

    return {
        digits,
        frac: millis === 0 ? '' : pad(millis, 3),
        inFrac: false,
    };
}

/** Arrow-key nudge. Never goes below zero. */
export function nudge(d: DurationDraft, deltaMs: number): DurationDraft {
    const ms = draftToMs(d) ?? 0;
    return msToDraft(Math.max(0, ms + deltaMs));
}

/**
 * What the field shows: the draft as typed, segments left unnormalized.
 *
 * Typing `95` reads `0:95` under the cursor — normalizing mid-typing would
 * rearrange digits the user is still entering. The readout carries the
 * meaning; blur settles the field itself.
 */
export function draftToText(d: DurationDraft): string {
    if (isEmptyDraft(d)) return '';
    const ss = pad(d.digits.slice(-2) || '0', 2);
    const mm = d.digits.slice(-4, -2);
    const hh = d.digits.slice(0, -4);
    const base =
        hh !== ''
            ? `${hh}:${pad(mm, 2)}:${ss}`
            : `${mm === '' ? '0' : mm}:${ss}`;
    return d.inFrac || d.frac !== '' ? `${base}.${d.frac}` : base;
}
