import { describe, expect, it } from 'vitest';
import { levelBoardLabel, splitLevelBoards } from '../display';

describe('levelBoardLabel', () => {
    const templates = [{ id: 9, display: 'Any%' }];
    it('uses the template display when the board has one', () => {
        expect(
            levelBoardLabel(
                { display: 'E1M1 — Any%', levelTemplateId: 9 },
                templates,
            ),
        ).toBe('Any%');
    });
    it('strips the level prefix when the template is unknown', () => {
        expect(
            levelBoardLabel(
                {
                    display: 'E1M1 — Secret exit',
                    levelTemplateId: null,
                    groupName: 'E1M1',
                },
                templates,
            ),
        ).toBe('Secret exit');
    });
    it('leaves a plain display alone', () => {
        expect(
            levelBoardLabel(
                { display: 'Any%', levelTemplateId: null },
                templates,
            ),
        ).toBe('Any%');
    });
});

describe('splitLevelBoards', () => {
    it('separates categories in level groups from the rest', () => {
        const groups = [
            { id: 1, kind: 'level' },
            { id: 2, kind: 'normal' },
        ];
        const cats = [
            { id: 10, groupId: 1 },
            { id: 11, groupId: 2 },
            { id: 12, groupId: null },
        ];
        expect(splitLevelBoards(cats, groups)).toEqual({
            fullGame: [cats[1], cats[2]],
            levelBoards: [cats[0]],
        });
    });
});
