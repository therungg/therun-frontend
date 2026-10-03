/** Where a run came from, as the run page names it. */
export function originLabel(source: string | null | undefined): string {
    switch (source) {
        case 'submission':
        case 'guest_submit':
            return 'Manually submitted';
        case 'src_import':
            return 'Imported from SRC';
        default:
            return 'Submitted from LiveSplit';
    }
}

/** Board rows and hover cards mark only typed-in runs. */
export function isManuallySubmitted(
    source: string | null | undefined,
): boolean {
    return source === 'submission' || source === 'guest_submit';
}
