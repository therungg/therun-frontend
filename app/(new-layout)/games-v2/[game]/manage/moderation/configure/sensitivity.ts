// Plain-language "auto-flag" sensitivity, mapped onto the two percentage
// auto-flag policies (`auto_flag_pb_jump_pct` + `auto_flag_faster_than_wr_pct`).
//
// 'off'    => both policies absent (delete if present)
// 'normal' => pbJump 50% / fasterThanWr 5%
// 'strict' => pbJump 25% / fasterThanWr 2%

export type Sensitivity = 'off' | 'normal' | 'strict';

export const SENSITIVITY_PCT: Record<
    Exclude<Sensitivity, 'off'>,
    { pbJumpPct: number; fasterThanWrPct: number }
> = {
    normal: { pbJumpPct: 50, fasterThanWrPct: 5 },
    strict: { pbJumpPct: 25, fasterThanWrPct: 2 },
};

/** Derive the current Sensitivity from existing pct policy values (nullable). */
export function sensitivityFromPcts(
    pbJumpPct: number | undefined,
    fasterThanWrPct: number | undefined,
): Sensitivity {
    if (pbJumpPct == null && fasterThanWrPct == null) return 'off';
    if ((pbJumpPct ?? 99) <= 25 || (fasterThanWrPct ?? 99) <= 2)
        return 'strict';
    return 'normal';
}
