import { describe, expect, it } from 'vitest';
import type { SrcImportJob } from '../../../../../../types/src-import.types';
import { fieldLabel, runsReport, settingsReport } from './change-report';

const base: SrcImportJob = {
    id: 1,
    gameId: 12,
    srcGameId: 'x',
    srcGameAbbreviation: 'sm64',
    srcGameName: 'Super Mario 64',
    srcUrl: 'https://www.speedrun.com/sm64',
    requestedBy: 1,
    status: 'done',
    phase: 'done',
    checkpoint: null,
    categoriesCount: 0,
    levelsCount: 0,
    variablesCount: 0,
    runsCount: 0,
    playersCount: 0,
    playersMatchedCount: 0,
    requestsMade: 0,
    estimatedRequests: null,
    error: null,
    startedAt: null,
    finishedAt: null,
    createdAt: '2026-09-03T10:00:00Z',
    commitStatus: 'applied',
    commitPhase: 'config',
    importedRunsCount: 0,
    importSkippedCount: 0,
    configAppliedAt: '2026-09-03T10:01:00Z',
    runsImportedAt: null,
    srcOnlyLeaderboard: false,
    kind: 'settings',
    changeSummary: null,
    commitFlags: null,
};

const config = {
    categoriesCreated: 3,
    categoriesUpdated: 12,
    categoriesUnfeatured: 0,
    levelsCreated: 2,
    levelsUpdated: 0,
    variablesCreated: 1,
    variablesUpdated: 4,
    themeApplied: true,
    gameFields: [
        { field: 'primaryTiming', from: 'realtime', to: 'gt' },
        { field: 'emulatorPolicy', from: 'allowed', to: 'banned' },
        { field: 'platforms', from: ['PC'], to: ['PC', 'Switch'] },
    ],
    moderatorsAssigned: 0,
    minTimeFloors: 0,
};

describe('settingsReport', () => {
    it('is null without a config summary', () => {
        expect(settingsReport(base)).toBeNull();
    });

    it('lists counts, then game fields, then theme', () => {
        const rows = settingsReport({
            ...base,
            changeSummary: {
                added: 0,
                updated: 0,
                removed: 0,
                archived: 0,
                config,
            },
        });
        expect(rows).toEqual([
            { label: 'Categories', value: '3 added · 12 updated' },
            { label: 'Levels', value: '2 added' },
            { label: 'Subcategories & filters', value: '1 added · 4 updated' },
            { label: 'Timing', value: 'Real time → Game time' },
            { label: 'Emulators', value: 'Allowed → Banned' },
            { label: 'Platforms', value: 'PC → PC, Switch' },
            { label: 'Theme', value: 'Updated' },
        ]);
    });

    it('is empty when nothing changed', () => {
        const rows = settingsReport({
            ...base,
            changeSummary: {
                added: 0,
                updated: 0,
                removed: 0,
                archived: 0,
                config: {
                    ...config,
                    categoriesCreated: 0,
                    categoriesUpdated: 0,
                    levelsCreated: 0,
                    variablesCreated: 0,
                    variablesUpdated: 0,
                    themeApplied: false,
                    gameFields: [],
                },
            },
        });
        expect(rows).toEqual([]);
    });
});

describe('runsReport', () => {
    it('is null without a change summary', () => {
        expect(runsReport({ ...base, kind: 'resync' })).toBeNull();
    });

    it('reports runs and runners', () => {
        const rows = runsReport({
            ...base,
            kind: 'resync',
            playersCount: 22,
            playersMatchedCount: 17,
            importSkippedCount: 5,
            changeSummary: { added: 41, updated: 3, removed: 0, archived: 0 },
        });
        expect(rows).toEqual([
            { label: 'Runs', value: '41 added · 3 updated' },
            { label: 'Runners', value: '17 matched · 5 skipped' },
        ]);
    });

    it('includes archived categories when present', () => {
        const rows = runsReport({
            ...base,
            kind: 'resync',
            changeSummary: { added: 0, updated: 0, removed: 2, archived: 1 },
        });
        expect(rows).toEqual([
            { label: 'Runs', value: '2 removed' },
            { label: 'Categories', value: '1 archived' },
        ]);
    });
});

describe('fieldLabel', () => {
    it('formats booleans, nulls and links', () => {
        expect(
            fieldLabel({ field: 'hideRealTime', from: false, to: true }),
        ).toEqual({ label: 'Real time column', value: 'Shown → Hidden' });
        expect(
            fieldLabel({
                field: 'discordUrl',
                from: null,
                to: 'https://discord.gg/x',
            }),
        ).toEqual({
            label: 'Discord',
            value: 'Not set → https://discord.gg/x',
        });
        expect(fieldLabel({ field: 'links', from: [], to: [] })).toEqual({
            label: 'Links',
            value: 'Source link updated',
        });
    });
});
