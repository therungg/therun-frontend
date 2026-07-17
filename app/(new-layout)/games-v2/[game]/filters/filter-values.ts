// Pure array-membership helpers for multi-value variable filters
// (`?platform=pc,ps4`). Shared by the popover dropdown (toggle) and the
// band's removable chips (remove) so both mutate the same URL param the
// same way.

export function addFilterValue(values: string[], value: string): string[] {
    return values.includes(value) ? values : [...values, value];
}

export function removeFilterValue(values: string[], value: string): string[] {
    return values.filter((v) => v !== value);
}

export function toggleFilterValue(values: string[], value: string): string[] {
    return values.includes(value)
        ? removeFilterValue(values, value)
        : addFilterValue(values, value);
}
