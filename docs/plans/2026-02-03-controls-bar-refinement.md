# Controls Bar Visual Refinement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refine controls bar visual hierarchy by renaming labels, improving spacing, and moving filters to the right.

**Architecture:** Three simple file edits to update labels and layout styling in existing components.

**Tech Stack:** React 19, TypeScript, inline styles

---

## Task 1: Update sort control label

**Files:**
- Modify: `app/(old-layout)/live/sort-control.tsx:17`

**Step 1: Update label text**

Change line 17 from:
```typescript
{ value: 'delta' as const, label: '⚡ Best Pace' },
```

To:
```typescript
{ value: 'delta' as const, label: '⚡ Delta to PB' },
```

**Step 2: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: No new type errors

**Step 3: Commit**

```bash
git add app/(old-layout)/live/sort-control.tsx
git commit -m "refactor: rename sort option from 'Best Pace' to 'Delta to PB'"
```

---

## Task 2: Update filter control label

**Files:**
- Modify: `app/(old-layout)/live/filter-control.tsx:31`

**Step 1: Update label text**

Change the pbPace filter button label on line 31 from:
```typescript
{
    key: 'pbPace',
    label: '⚡ PB Pace',
    color: '#198754',
    ariaLabel: 'Filter by runs ahead of personal best',
},
```

To:
```typescript
{
    key: 'pbPace',
    label: '⚡ Ahead of PB',
    color: '#198754',
    ariaLabel: 'Filter by runs ahead of personal best',
},
```

Note: Only the `label` changes, `ariaLabel` stays descriptive.

**Step 2: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: No new type errors

**Step 3: Commit**

```bash
git add app/(old-layout)/live/filter-control.tsx
git commit -m "refactor: rename filter from 'PB Pace' to 'Ahead of PB'"
```

---

## Task 3: Refine controls bar layout and spacing

**Files:**
- Modify: `app/(old-layout)/live/live.tsx:170,180-187,190,220-223`

**Step 1: Increase container spacing**

Change line 170 from:
```typescript
className="d-flex flex-wrap align-items-center gap-3 p-3 rounded-3 shadow-sm"
```

To:
```typescript
className="d-flex flex-wrap align-items-center gap-4 p-4 rounded-3 shadow-sm"
```

**Step 2: Remove vertical divider**

Delete lines 180-187 (the entire divider div):
```typescript
<div
    style={{
        width: '1px',
        height: '32px',
        background: 'var(--bs-border-color)',
        opacity: 0.5,
    }}
/>
```

**Step 3: Remove search maxWidth constraint**

On line 190 (now 183 after deletion), change:
```typescript
<div
    className="input-group flex-grow-1"
    style={{ maxWidth: '400px' }}
>
```

To:
```typescript
<div className="input-group flex-grow-1">
```

**Step 4: Wrap FilterControl to push right**

Change lines 220-223 (now 213-216 after deletions) from:
```typescript
<FilterControl
    filters={filters}
    onChange={setFilters}
/>
```

To:
```typescript
<div style={{ marginLeft: 'auto' }}>
    <FilterControl
        filters={filters}
        onChange={setFilters}
    />
</div>
```

**Step 5: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: No new type errors

**Step 6: Test in development server**

Run: `npm run dev`
Navigate to: `http://localhost:3000/live`
Expected:
- More spacious controls bar (larger padding and gaps)
- No vertical divider between sort and search
- Search input flexes naturally (no 400px constraint)
- Filters grouped on the right side of the bar

**Step 7: Commit**

```bash
git add app/(old-layout)/live/live.tsx
git commit -m "refactor: improve controls bar visual hierarchy and spacing

- Increase spacing from gap-3/p-3 to gap-4/p-4
- Remove vertical divider between sort and search
- Remove search maxWidth constraint for natural flex
- Move filters to right with margin-left: auto"
```

---

## Task 4: Final verification and documentation

**Files:**
- Modify: `docs/plans/2026-02-03-controls-bar-refinement-design.md:4`

**Step 1: Update design doc status**

Change status from "Approved" to "Implemented":

```markdown
**Status:** Implemented
```

**Step 2: Run linter**

Run: `npm run lint-fix`
Expected: Auto-fixes any style issues

**Step 3: Run type check**

Run: `npm run typecheck`
Expected: No new type errors

**Step 4: Stop dev server**

Run: `pkill -f "next dev"`
Expected: Development server stops

**Step 5: Final commit**

```bash
git add docs/plans/2026-02-03-controls-bar-refinement-design.md
git commit -m "docs: mark controls bar refinement design as implemented"
```

**Step 6: Verify all commits**

Run: `git log --oneline -4`
Expected: See all 4 commits for this refinement

---

## Success Criteria

- [ ] Sort dropdown shows "⚡ Delta to PB" instead of "⚡ Best Pace"
- [ ] Filter button shows "⚡ Ahead of PB" instead of "⚡ PB Pace"
- [ ] Controls bar has more generous spacing (gap-4, p-4)
- [ ] No vertical divider between sort and search
- [ ] Search input flexes naturally to fill space
- [ ] Filters are grouped and right-aligned
- [ ] Visual hierarchy is clear: sort left, search center, filters right
- [ ] All TypeScript types are correct
- [ ] No linter errors
- [ ] Responsive behavior still works (wrapping on mobile)

## Notes

- This is purely visual refinement - no functional changes
- No new components created, only existing components modified
- Labels become clearer and less redundant
- Layout uses flexbox margin-left: auto to push filters right
- Whitespace creates visual separation (no need for dividers)
