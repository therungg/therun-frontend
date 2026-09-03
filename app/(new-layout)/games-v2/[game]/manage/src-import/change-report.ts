import type {
    SrcConfigFieldChange,
    SrcConfigFieldValue,
    SrcImportJob,
} from '../../../../../../types/src-import.types';

export interface ReportRow {
    label: string;
    value: string;
}

const ARROW = ' → ';
const SEP = ' · ';

/** "3 added · 12 updated" from (count, word) pairs; zero parts drop out. */
function counts(parts: Array<[number, string]>): string {
    return parts
        .filter(([n]) => n > 0)
        .map(([n, word]) => `${n.toLocaleString()} ${word}`)
        .join(SEP);
}

function row(label: string, value: string): ReportRow | null {
    return value ? { label, value } : null;
}

const FIELD_LABEL: Record<string, string> = {
    emulatorPolicy: 'Emulators',
    primaryTiming: 'Timing',
    gameTimeLabel: 'Game time label',
    hideRealTime: 'Real time column',
    hideGameTime: 'Game time column',
    showMilliseconds: 'Milliseconds',
    platforms: 'Platforms',
    releaseYear: 'Release year',
    discordUrl: 'Discord',
    links: 'Links',
};

function fmt(field: string, v: SrcConfigFieldValue): string {
    if (v === null || v === undefined) return 'Not set';
    switch (field) {
        case 'emulatorPolicy':
            if (v === 'allowed') return 'Allowed';
            if (v === 'banned') return 'Banned';
            return String(v);
        case 'primaryTiming':
            if (v === 'rt' || v === 'realtime') return 'Real time';
            if (v === 'gt' || v === 'gametime') return 'Game time';
            return String(v);
        case 'gameTimeLabel':
            return String(v).toUpperCase();
        case 'hideRealTime':
        case 'hideGameTime':
            return v ? 'Hidden' : 'Shown';
        case 'showMilliseconds':
            return v ? 'Shown' : 'Hidden';
        case 'platforms':
            return Array.isArray(v) && v.length > 0
                ? (v as string[]).join(', ')
                : 'None';
        default:
            return String(v);
    }
}

/** One report row for a changed game-level field. */
export function fieldLabel(change: SrcConfigFieldChange): ReportRow {
    const label = FIELD_LABEL[change.field] ?? change.field;
    if (change.field === 'links') {
        return { label, value: 'Source link updated' };
    }
    return {
        label,
        value: `${fmt(change.field, change.from)}${ARROW}${fmt(change.field, change.to)}`,
    };
}

/**
 * What a settings import changed, as label/value rows in a fixed order:
 * structure counts, game-level fields, then theme/moderators/floors. Empty
 * when the apply found nothing to change; null when the job predates the
 * config summary.
 */
export function settingsReport(job: SrcImportJob): ReportRow[] | null {
    const c = job.changeSummary?.config;
    if (!c) return null;
    const rows: Array<ReportRow | null> = [
        row(
            'Categories',
            counts([
                [c.categoriesCreated, 'added'],
                [c.categoriesUpdated, 'updated'],
            ]),
        ),
        row(
            'Levels',
            counts([
                [c.levelsCreated, 'added'],
                [c.levelsUpdated, 'updated'],
            ]),
        ),
        row(
            'Subcategories & filters',
            counts([
                [c.variablesCreated, 'added'],
                [c.variablesUpdated, 'updated'],
            ]),
        ),
        row(
            'Unfeatured',
            c.categoriesUnfeatured > 0
                ? `${c.categoriesUnfeatured} therun-only board${c.categoriesUnfeatured === 1 ? '' : 's'}`
                : '',
        ),
        ...c.gameFields.map(fieldLabel),
        row('Theme', c.themeApplied ? 'Updated' : ''),
        row('Moderators', counts([[c.moderatorsAssigned, 'added']])),
        row(
            'Minimum times',
            c.minTimeFloors > 0
                ? `${c.minTimeFloors} floor${c.minTimeFloors === 1 ? '' : 's'} set`
                : '',
        ),
    ];
    return rows.filter((r): r is ReportRow => r !== null);
}

/** What a runs import changed. Null when the job has no change summary yet. */
export function runsReport(job: SrcImportJob): ReportRow[] | null {
    const s = job.changeSummary;
    if (!s) return null;
    const rows: Array<ReportRow | null> = [
        row(
            'Runs',
            counts([
                [s.added, 'added'],
                [s.updated, 'updated'],
                [s.removed, 'removed'],
            ]),
        ),
        row(
            'Runners',
            counts([
                [job.playersMatchedCount, 'matched'],
                [job.importSkippedCount, 'skipped'],
            ]),
        ),
        row('Categories', counts([[s.archived, 'archived']])),
    ];
    return rows.filter((r): r is ReportRow => r !== null);
}
