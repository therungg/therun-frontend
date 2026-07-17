import type { DeckKind } from './dossier.types';

export interface PrepGoal {
    text: string;
    targetTimeMs?: number;
}

export interface PrepQuote {
    id: string;
    text: string;
    context?: string;
}

export interface PrepFact {
    id: string;
    template: 'fact' | 'versus' | 'history';
    title?: string;
    body: string;
    secondary?: string;
}

export interface PrepClip {
    id: string;
    videoUrl: string;
    title: string;
    caption?: string;
}

export interface PrepRoadmapNote {
    splitIndex: number;
    text: string;
}

export type PrepSlideRef =
    | { kind: 'stat'; id: string }
    | { kind: 'custom'; id: string };

export interface PrepSessionData {
    interview: {
        goal?: PrepGoal;
        quotes: PrepQuote[];
        facts: PrepFact[];
    };
    clips: PrepClip[];
    headshotUrl?: string;
    roadmapNotes: PrepRoadmapNote[];
    deckOrder?: {
        pre?: PrepSlideRef[];
        post?: PrepSlideRef[];
    };
}

export interface PrepSessionSummary {
    id: number;
    label: string;
    updatedAt: string;
}

export interface PrepSession extends PrepSessionSummary {
    username: string;
    game: string;
    category: string;
    createdAt: string;
    data: PrepSessionData;
}

export type CustomSlideKind =
    | 'quote'
    | 'clip'
    | 'fact'
    | 'called-shot'
    | 'called-shot-result';

export type CustomSlideContent =
    | { kind: 'quote'; quote: PrepQuote }
    | { kind: 'fact'; fact: PrepFact }
    | { kind: 'clip'; clip: PrepClip }
    | { kind: 'called-shot'; goal: PrepGoal }
    | { kind: 'called-shot-result'; goal: PrepGoal };

export interface CustomSlideItem {
    id: string;
    content: CustomSlideContent;
}

export const emptyPrepData = (): PrepSessionData => ({
    interview: { quotes: [], facts: [] },
    clips: [],
    roadmapNotes: [],
});

// --- lenient parsing (mirrors backend sanitizePrepData) ---

const str = (v: unknown): string | undefined =>
    typeof v === 'string' && v.trim() ? v : undefined;

const num = (v: unknown): number | undefined =>
    typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined;

const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

const obj = (v: unknown): Record<string, unknown> =>
    v && typeof v === 'object' && !Array.isArray(v)
        ? (v as Record<string, unknown>)
        : {};

const parseGoal = (raw: unknown): PrepGoal | undefined => {
    const g = obj(raw);
    const text = str(g.text);
    if (!text) return undefined;
    const targetTimeMs = num(g.targetTimeMs);
    return targetTimeMs ? { text, targetTimeMs } : { text };
};

const parseQuote = (raw: unknown): PrepQuote | undefined => {
    const q = obj(raw);
    const id = str(q.id);
    const text = str(q.text);
    if (!id || !text) return undefined;
    const context = str(q.context);
    return context ? { id, text, context } : { id, text };
};

const FACT_TEMPLATES = ['fact', 'versus', 'history'] as const;

const parseFact = (raw: unknown): PrepFact | undefined => {
    const f = obj(raw);
    const id = str(f.id);
    const body = str(f.body);
    const template = FACT_TEMPLATES.find((t) => t === f.template);
    if (!id || !body || !template) return undefined;
    const fact: PrepFact = { id, template, body };
    const title = str(f.title);
    if (title) fact.title = title;
    const secondary = str(f.secondary);
    if (secondary) fact.secondary = secondary;
    return fact;
};

const parseClip = (raw: unknown): PrepClip | undefined => {
    const c = obj(raw);
    const id = str(c.id);
    const videoUrl = str(c.videoUrl);
    const title = str(c.title);
    if (!id || !videoUrl || !title) return undefined;
    const caption = str(c.caption);
    return caption ? { id, videoUrl, title, caption } : { id, videoUrl, title };
};

const parseNote = (raw: unknown): PrepRoadmapNote | undefined => {
    const n = obj(raw);
    const text = str(n.text);
    if (
        typeof n.splitIndex !== 'number' ||
        !Number.isInteger(n.splitIndex) ||
        n.splitIndex < 0 ||
        !text
    ) {
        return undefined;
    }
    return { splitIndex: n.splitIndex, text };
};

const parseRef = (raw: unknown): PrepSlideRef | undefined => {
    const r = obj(raw);
    const id = str(r.id);
    if (!id) return undefined;
    if (r.kind === 'stat') return { kind: 'stat', id };
    if (r.kind === 'custom') return { kind: 'custom', id };
    return undefined;
};

const parseRefs = (raw: unknown): PrepSlideRef[] | undefined => {
    if (!Array.isArray(raw)) return undefined;
    const refs = raw
        .map(parseRef)
        .filter((r): r is PrepSlideRef => r !== undefined);
    return refs.length > 0 ? refs : undefined;
};

export const parsePrepData = (raw: unknown): PrepSessionData => {
    const root = obj(raw);
    const interview = obj(root.interview);
    const data: PrepSessionData = {
        interview: {
            quotes: arr(interview.quotes)
                .map(parseQuote)
                .filter((q): q is PrepQuote => q !== undefined),
            facts: arr(interview.facts)
                .map(parseFact)
                .filter((f): f is PrepFact => f !== undefined),
        },
        clips: arr(root.clips)
            .map(parseClip)
            .filter((c): c is PrepClip => c !== undefined),
        roadmapNotes: arr(root.roadmapNotes)
            .map(parseNote)
            .filter((n): n is PrepRoadmapNote => n !== undefined),
    };
    const goal = parseGoal(interview.goal);
    if (goal) data.interview.goal = goal;
    const headshotUrl = str(root.headshotUrl);
    if (headshotUrl) data.headshotUrl = headshotUrl;
    const order = obj(root.deckOrder);
    const pre = parseRefs(order.pre);
    const post = parseRefs(order.post);
    if (pre || post) {
        data.deckOrder = {};
        if (pre) data.deckOrder.pre = pre;
        if (post) data.deckOrder.post = post;
    }
    return data;
};

export const customSlidesFromPrep = (
    data: PrepSessionData,
    deck: DeckKind,
): CustomSlideItem[] => {
    const items: CustomSlideItem[] = [];
    const goal = data.interview.goal;
    if (goal) {
        items.push(
            deck === 'pre'
                ? { id: 'goal', content: { kind: 'called-shot', goal } }
                : {
                      id: 'goal-result',
                      content: { kind: 'called-shot-result', goal },
                  },
        );
    }
    for (const quote of data.interview.quotes) {
        items.push({ id: quote.id, content: { kind: 'quote', quote } });
    }
    for (const fact of data.interview.facts) {
        items.push({ id: fact.id, content: { kind: 'fact', fact } });
    }
    for (const clip of data.clips) {
        items.push({ id: clip.id, content: { kind: 'clip', clip } });
    }
    return items;
};

export const headlineForCustom = (content: CustomSlideContent): string => {
    switch (content.kind) {
        case 'quote':
            return content.quote.context ?? 'In their own words';
        case 'fact':
            return content.fact.title ?? content.fact.body;
        case 'clip':
            return content.clip.title;
        case 'called-shot':
            return 'The called shot';
        case 'called-shot-result':
            return 'The verdict';
    }
};
