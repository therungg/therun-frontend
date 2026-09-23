import { REVIEW_REASON_LABEL } from '~src/lib/moderation/run-status-copy';
import { videoSource } from '~src/lib/vod-url';
import type { VariableRow } from '../../../../../../types/leaderboards.types';
import type { TimelineEvent } from '../../../../../../types/run-review.types';
import { REJECTION_REASONS } from '../../manage/moderation/shared/rejection-reasons';
import { AUTO_VERIFY_CHECK_LABELS } from '../run-badges';

/** A piece of the sentence: plain text, or text that links out. */
export type Segment = string | { text: string; href: string };

/** One value on either side of a change. */
export type ChangeValue =
    | { t: 'time'; ms: number }
    | { t: 'text'; text: string }
    | { t: 'link'; text: string; href: string }
    | { t: 'none' };

/** The muted second line, one part per `·`. */
export type DetailPart =
    | { t: 'text'; text: string }
    | { t: 'quote'; text: string }
    | { t: 'link'; text: string; href: string }
    | { t: 'change'; label: string; before: ChangeValue; after: ChangeValue };

export type TimelineTone = 'red' | 'amber' | 'green' | 'neutral';

export type TimelineCopy = {
    /**
     * The sentence. With `standalone` false it follows the actor's name
     * ("verified it"); with it true it reads on its own after a `·`
     * ("Uploaded by zgsr's timer").
     */
    sentence: Segment[];
    standalone: boolean;
    details: DetailPart[];
    tone: TimelineTone;
    /** The time is when the source last touched the event, not when it happened. */
    approximate: boolean;
};

export type TimelineCopyContext = {
    runnerName: string;
    variables: VariableRow[];
};

// The name the backend gives its import actor; the copy reuses it rather
// than spelling the site out anywhere else.
type SystemName = Extract<TimelineEvent['actor'], { kind: 'system' }>['name'];
const SOURCE_SITE: SystemName = 'speedrun.com';

const FIELD_LABELS: Record<string, string> = {
    time: 'Time',
    gameTime: 'Game time',
    sourceTime: 'Source time',
    sourceGameTime: 'Source game time',
    vodUrl: 'Video',
    modNote: 'Mod note',
    platform: 'Platform',
    emulator: 'Emulator',
    leaderboardEligible: 'On the board',
    ineligibleReason: 'Off-board reason',
    description: 'Description',
    vodReview: 'Video review',
    participants: 'Runners',
    runDate: 'Run date',
    categoryId: 'Category',
    subcategoryKey: 'Subcategory',
};

const TIME_FIELDS = new Set([
    'time',
    'gameTime',
    'sourceTime',
    'sourceGameTime',
]);

const FLAG_LABELS: Record<string, string> = {
    missing_video: 'no video',
    ...Object.fromEntries(
        Object.entries(REVIEW_REASON_LABEL).map(([k, v]) => [
            k,
            v.toLowerCase(),
        ]),
    ),
    ...Object.fromEntries(
        Object.entries(AUTO_VERIFY_CHECK_LABELS).map(([k, v]) => [
            k,
            v.toLowerCase(),
        ]),
    ),
};

const MAX_TEXT = 80;

/** "request_video" → "Request video", "edit-own-evidence" → "Edit own evidence". */
export function humanise(raw: string): string {
    const spaced = raw
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .trim()
        .toLowerCase();
    return spaced ? spaced[0].toUpperCase() + spaced.slice(1) : raw;
}

const rec = (v: unknown): Record<string, unknown> =>
    v !== null && typeof v === 'object' && !Array.isArray(v)
        ? (v as Record<string, unknown>)
        : {};
const str = (v: unknown): string | null =>
    typeof v === 'string' && v !== '' ? v : null;
const num = (v: unknown): number | null => {
    const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
    return typeof n === 'number' && Number.isFinite(n) ? n : null;
};

function clip(s: string): string {
    return s.length > MAX_TEXT ? `${s.slice(0, MAX_TEXT - 1)}…` : s;
}

function flagLabel(reason: unknown): string {
    const r = str(reason);
    if (!r) return 'flag';
    return FLAG_LABELS[r] ?? humanise(r).toLowerCase();
}

function srcRunLink(id: unknown): Segment | null {
    const s = str(id);
    return s
        ? { text: `run ${s}`, href: `https://www.speedrun.com/run/${s}` }
        : null;
}

function videoPart(url: unknown): DetailPart | null {
    const u = str(url);
    if (!u) return null;
    return { t: 'link', text: `${videoSource(u)} ↗`, href: u };
}

function value(field: string, v: unknown): ChangeValue {
    if (v == null || v === '') return { t: 'none' };
    if (TIME_FIELDS.has(field)) {
        const ms = num(v);
        if (ms != null) return { t: 'time', ms };
    }
    if (field === 'vodUrl' && typeof v === 'string') {
        return { t: 'link', text: `${videoSource(v)} ↗`, href: v };
    }
    if (typeof v === 'boolean') return { t: 'text', text: v ? 'yes' : 'no' };
    if (Array.isArray(v)) {
        return v.length === 0
            ? { t: 'none' }
            : { t: 'text', text: clip(v.map(String).join(', ')) };
    }
    if (typeof v === 'object') return { t: 'text', text: 'changed' };
    return { t: 'text', text: clip(String(v)) };
}

function variableName(key: string, ctx: TimelineCopyContext): string {
    return (
        ctx.variables.find((v) => v.nameNormalized === key)?.name ??
        humanise(key)
    );
}

/** before → after for every field an edit changed; variables one by one. */
function changes(
    data: Record<string, unknown>,
    ctx: TimelineCopyContext,
): DetailPart[] {
    const before = rec(data.before);
    const after = rec(data.after);
    const fields = Array.isArray(data.changedFields)
        ? (data.changedFields as unknown[]).filter(
              (f): f is string => typeof f === 'string',
          )
        : [...new Set([...Object.keys(before), ...Object.keys(after)])];
    const out: DetailPart[] = [];
    for (const field of fields) {
        if (field === 'variables') {
            const b = rec(before.variables);
            const a = rec(after.variables);
            for (const key of new Set([...Object.keys(b), ...Object.keys(a)])) {
                if (String(b[key] ?? '') === String(a[key] ?? '')) continue;
                out.push({
                    t: 'change',
                    label: variableName(key, ctx),
                    before: value(key, b[key]),
                    after: value(key, a[key]),
                });
            }
            continue;
        }
        out.push({
            t: 'change',
            label: FIELD_LABELS[field] ?? humanise(field),
            before: value(field, before[field]),
            after: value(field, after[field]),
        });
    }
    return out;
}

function toneOf(e: TimelineEvent): TimelineTone {
    switch (e.kind) {
        case 'rejected':
        case 'removed':
        case 'reported':
            return 'red';
        case 'auto_check':
            return e.data.outcome === 'fail'
                ? 'red'
                : e.data.outcome === 'pass'
                  ? 'green'
                  : 'neutral';
        case 'queued':
        case 'flagged':
        case 'video_requested':
        case 'held_submitted':
            return 'amber';
        case 'verified':
            return 'green';
        default:
            return 'neutral';
    }
}

/** The one plain sentence a timeline row says, plus its muted details. */
export function describeTimelineEvent(
    e: TimelineEvent,
    ctx: TimelineCopyContext,
): TimelineCopy {
    const d = e.data;
    const system = e.actor.kind === 'system';
    const details: DetailPart[] = [];
    let sentence: Segment[];
    // System actors read "Name · Sentence"; people read "name does it".
    let standalone = system;
    const self = d.self === true;

    const push = (p: DetailPart | null) => {
        if (p) details.push(p);
    };
    const videoAtArrival = () => {
        if (d.hadVideoAtArrival === true)
            push({ t: 'text', text: 'with a video' });
        else if (d.hadVideoAtArrival === false)
            push({ t: 'text', text: 'no video' });
    };
    const finishTime = () => {
        if (d.atIsFinishTime === true)
            push({
                t: 'text',
                text: 'arrival time unknown, shows when it ended',
            });
    };

    switch (e.kind) {
        case 'arrived': {
            const source = str(d.source);
            if (source === 'timer') {
                sentence = [`Uploaded by ${ctx.runnerName}’s timer`];
            } else if (source === 'submission') {
                sentence = system ? ['Submitted'] : ['submitted it'];
            } else if (source === 'guest_submit') {
                sentence = system
                    ? ['Submitted as a guest run']
                    : ['submitted it as a guest run'];
            } else if (system) {
                sentence = ['Arrived'];
            } else {
                sentence = ['added it'];
            }
            videoAtArrival();
            finishTime();
            break;
        }
        case 'src_imported': {
            const link = srcRunLink(d.srcRunId);
            const job = num(d.jobId);
            sentence = [
                `Imported from ${SOURCE_SITE} `,
                ...(link ? [link] : ['']),
                job != null ? ` by import job ${job}` : '',
            ];
            standalone = true;
            videoAtArrival();
            finishTime();
            break;
        }
        case 'src_submitted': {
            const link = srcRunLink(d.srcRunId);
            const withVideo = d.hadVideo === true;
            const tail = [
                ...(link ? [' (', link, ')'] : []),
                withVideo ? ' with a video' : ' without a video',
            ];
            sentence = system
                ? [`Submitted by ${ctx.runnerName}`, ...tail]
                : [`submitted it to ${SOURCE_SITE}`, ...tail];
            push(videoPart(d.videoUrl));
            push({
                t: 'text',
                text:
                    d.statusThere === 'verified'
                        ? 'already verified there'
                        : 'still unverified there',
            });
            break;
        }
        case 'src_verified': {
            const link = srcRunLink(d.srcRunId);
            sentence = link ? ['Verified ', link] : ['Verified it'];
            standalone = true;
            break;
        }
        case 'src_linked': {
            const link = srcRunLink(d.srcRunId);
            const job = num(d.jobId);
            sentence = [
                `Linked to ${SOURCE_SITE} `,
                ...(link ? [link] : ['run']),
                job != null ? ` by import job ${job}` : '',
            ];
            standalone = true;
            const copied = Array.isArray(d.copied) ? d.copied : [];
            if (copied.includes('vodUrl'))
                push({ t: 'text', text: 'video copied from that run' });
            if (copied.includes('sourceTime'))
                push({ t: 'text', text: 'its times recorded' });
            if (copied.includes('verified'))
                push({ t: 'text', text: 'verified on its say-so' });
            if (!copied.includes('vodUrl')) push(videoPart(d.sourceVideoUrl));
            if (d.verifiedThere != null && !copied.includes('verified'))
                push({ t: 'text', text: 'verified there' });
            if (d.inferred === true)
                push({ t: 'text', text: 'pieced together from the run' });
            break;
        }
        case 'auto_check': {
            const outcome = d.outcome;
            if (outcome === 'pass') {
                sentence = [
                    d.verified === true ? 'Passed and verified it' : 'Passed',
                ];
            } else if (outcome === 'fail') {
                sentence = ['Failed'];
            } else {
                sentence = ['Could not check it'];
                const why = str(d.uncheckedReason);
                if (why) push({ t: 'text', text: humanise(why) });
            }
            for (const c of Array.isArray(d.failedChecks)
                ? d.failedChecks
                : []) {
                const name = str(rec(c).name);
                if (!name) continue;
                const label =
                    AUTO_VERIFY_CHECK_LABELS[
                        name as keyof typeof AUTO_VERIFY_CHECK_LABELS
                    ] ?? humanise(name);
                const why = str(rec(c).reason);
                push({ t: 'text', text: why ? `${label}: ${why}` : label });
            }
            break;
        }
        case 'queued': {
            sentence = ['Entered the queue'];
            standalone = true;
            for (const c of Array.isArray(d.failedChecks)
                ? d.failedChecks
                : []) {
                const name = str(rec(c).name);
                const why = str(rec(c).reason);
                const label = name
                    ? (AUTO_VERIFY_CHECK_LABELS[
                          name as keyof typeof AUTO_VERIFY_CHECK_LABELS
                      ] ?? humanise(name))
                    : null;
                const text = why ?? label;
                if (text) push({ t: 'text', text });
            }
            // Whether they are new today, not when the run arrived.
            if (d.newRunner === true) push({ t: 'text', text: 'new runner' });
            break;
        }
        case 'flagged': {
            const label = flagLabel(d.flagReason);
            sentence = system
                ? [`Flagged it: ${label}`]
                : [`flagged it: ${label}`];
            const severity = str(d.severity);
            if (severity && severity !== 'low')
                push({ t: 'text', text: `${severity} severity` });
            const detail = str(rec(d.details).reason);
            if (detail) push({ t: 'text', text: detail });
            break;
        }
        case 'flag_resolved': {
            const label = flagLabel(d.flagReason);
            if (system) {
                sentence = [humanise(`${label} flag cleared`)];
            } else {
                sentence = [`cleared the “${label}” flag`];
            }
            if (d.via === 'verdict')
                push({ t: 'text', text: 'cleared by the verdict' });
            break;
        }
        case 'reported':
            sentence = system ? ['Reported'] : ['reported it'];
            break;
        case 'appealed':
            sentence = system ? ['Appealed'] : ['appealed'];
            break;
        case 'video_requested':
            sentence = system ? ['Asked for a video'] : ['asked for a video'];
            break;
        case 'video_added':
            sentence = system ? ['Video added'] : ['added a video'];
            break;
        case 'video_waived':
            sentence =
                d.via === 'verified'
                    ? ['verified it without a video']
                    : ['waived the video'];
            break;
        case 'evidence_edited': {
            const fields = Array.isArray(d.changedFields)
                ? d.changedFields
                : [];
            const onlyVideo = fields.length === 1 && fields[0] === 'vodUrl';
            const vod = rec(d.vodUrl);
            sentence = onlyVideo
                ? [vod.before ? 'changed the video' : 'added a video']
                : ['edited the evidence'];
            details.push(...changes(d, ctx));
            break;
        }
        case 'held_submitted':
            sentence = ['submitted the held PB'];
            details.push(...changes(d, ctx));
            break;
        case 'verified':
            sentence = [self ? 'verified their own run' : 'verified it'];
            break;
        case 'rejected': {
            sentence = [self ? 'rejected their own run' : 'rejected it'];
            const key = str(d.reasonKey);
            const label = key
                ? REJECTION_REASONS.find((r) => r.key === key)?.label
                : null;
            // "Other" says nothing a note does not; it shows only alone.
            if (label && (key !== 'other' || !e.reason))
                push({ t: 'text', text: label });
            break;
        }
        case 'sent_back':
            sentence = ['sent it back to pending'];
            break;
        case 'restored':
            sentence = [
                self ? 'withdrew their own rejection' : 'undid the rejection',
            ];
            break;
        case 'removed':
            sentence = system
                ? ['Took it off the board']
                : [
                      self
                          ? 'took their run off the board'
                          : 'took it off the board',
                  ];
            break;
        case 're_included':
            sentence = [
                self
                    ? 'put their run back on the board'
                    : 'put it back on the board',
            ];
            break;
        case 'moved': {
            const from = str(d.fromCategory);
            const to = str(d.toCategory);
            const fromSub = str(d.fromSubcategoryKey);
            const toSub = str(d.toSubcategoryKey);
            if (d.boardOverride === 'set') {
                sentence = [
                    to ? `placed it on ${to}` : 'placed it on another board',
                ];
            } else if (d.boardOverride === 'clear') {
                sentence = ['put it back on its own board'];
            } else if (from && to && from !== to) {
                sentence = [`moved it from ${from} to ${to}`];
            } else if (to) {
                sentence = [`moved it within ${to}`];
            } else {
                sentence = ['moved it to another board'];
            }
            if (fromSub !== toSub && (fromSub || toSub)) {
                details.push({
                    t: 'change',
                    label: 'Subcategory',
                    before: value('subcategoryKey', fromSub),
                    after: value('subcategoryKey', toSub),
                });
            }
            break;
        }
        case 'edited':
            sentence = [self ? 'edited their run' : 'edited it'];
            details.push(...changes(d, ctx));
            break;
        case 'note': {
            const before = str(d.before);
            const after = str(d.after);
            sentence = [
                !after
                    ? 'cleared the mod note'
                    : before
                      ? 'changed the mod note'
                      : 'added a mod note',
            ];
            if (after) push({ t: 'quote', text: clip(after) });
            break;
        }
        case 'marked':
            sentence = ['marked it for later'];
            break;
        case 'unmarked':
            sentence = ['cleared the mark for later'];
            break;
        case 'anonymized':
            sentence = [
                d.lifted === true
                    ? 'showed the runner’s name again'
                    : 'hid the runner’s name',
            ];
            break;
        default: {
            const action = str(d.action);
            sentence = [action ? humanise(action) : 'Something changed'];
            standalone = true;
        }
    }

    // The reason, report text or appeal text, always last and quoted.
    if (e.reason) push({ t: 'quote', text: e.reason });

    return {
        sentence: sentence.filter((s) => s !== ''),
        standalone,
        details,
        tone: toneOf(e),
        approximate: d.approximate === true || d.atApproximate === true,
    };
}
