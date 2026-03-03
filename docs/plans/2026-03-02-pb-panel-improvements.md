# PB Panel Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make carousel slides tappable, upgrade the compact list to a richer feed with game thumbnails, and increase feed items to 15.

**Architecture:** Three changes to existing files — wrap carousel slides in Link, redesign the CompactItem component to include game thumbnails with overlapping runner avatars, and bump the PB fetch limit from 10 to 15.

**Tech Stack:** Next.js App Router, React, SCSS modules, next/image

---

### Task 1: Make carousel slides tappable

**Files:**
- Modify: `app/(new-layout)/frontpage/sections/pb-feed-client.tsx`

**Step 1: Wrap each carousel slide in a Link**

In `FeaturedCarousel`, the slide `<div>` at line 307 needs to become navigable. Wrap the `featuredContent` div in a `<Link>` to `/{username}`. The outer `<div>` must stay because it carries the ref and scroll-snap positioning.

Add an `onClick` guard so clicks after a drag (swipe) don't navigate — use the existing `dragState.current.moved` flag.

```tsx
// Inside the pbs.map callback, replace the featuredContent div:
<Link
    href={`/${pb.username}`}
    className={styles.featuredLink}
    onClick={(e) => {
        if (dragState.current.moved) {
            e.preventDefault();
        }
    }}
    draggable={false}
>
    <div className={styles.featuredContent}>
        {/* ...existing content unchanged... */}
    </div>
</Link>
```

Remove the existing `<div className={styles.featuredContent}>` wrapper — the Link replaces it as the container inside the slide.

The `UserLink` inside the slide will still work as a nested link. Since `UserLink` renders an `<a>` inside an `<a>`, change the `UserLink` to a `<span>` to avoid nested anchors. Replace:
```tsx
<UserLink username={pb.username} />
```
with:
```tsx
{pb.username}
```

Since the whole slide already links to `/{username}`, the separate `UserLink` is redundant.

**Step 2: Add the featuredLink style**

In `pb-feed.module.scss`, add after `.featuredSlide`:

```scss
.featuredLink {
    display: flex;
    flex-direction: column;
    height: 100%;
    text-decoration: none;
    color: inherit;
    user-select: none;

    &:hover {
        text-decoration: none;
        color: inherit;
    }
}
```

**Step 3: Verify build**

Run: `npm run typecheck`
Expected: PASS — no type errors.

**Step 4: Commit**

```bash
git add app/(new-layout)/frontpage/sections/pb-feed-client.tsx app/(new-layout)/frontpage/sections/pb-feed.module.scss
git commit -m "feat: make carousel slides tappable links to runner profiles"
```

---

### Task 2: Add game thumbnails to feed rows

**Files:**
- Modify: `app/(new-layout)/frontpage/sections/pb-feed-client.tsx`
- Modify: `app/(new-layout)/frontpage/sections/pb-feed.module.scss`

**Step 1: Pass gameImages to CompactItem**

In `PbFeedClient`, the `allPbs.map` currently only passes `avatarUrl`. Add `gameImageUrl`:

```tsx
{allPbs.map((pb) => (
    <CompactItem
        key={pb.id}
        pb={pb}
        avatarUrl={userPictures[pb.username]}
        gameImageUrl={gameImages[pb.game]}
    />
))}
```

Update `CompactItem` props:

```tsx
const CompactItem = ({
    pb,
    avatarUrl,
    gameImageUrl,
}: {
    pb: FinishedRunPB;
    avatarUrl?: string;
    gameImageUrl?: string;
}) => {
```

**Step 2: Redesign the CompactItem JSX**

Replace the current CompactItem return with a layout that has a game thumbnail on the left with the runner avatar overlapping its bottom-right corner:

```tsx
return (
    <Link href={`/${pb.username}`} className={styles.listItem}>
        <div className={styles.listThumbWrap}>
            {gameImageUrl ? (
                <img
                    src={gameImageUrl}
                    alt=""
                    className={styles.listGameThumb}
                />
            ) : (
                <div className={styles.listGameThumbFallback} />
            )}
            {avatarUrl && (
                <Image
                    src={avatarUrl}
                    alt=""
                    width={24}
                    height={24}
                    className={styles.listAvatarOverlay}
                    unoptimized
                />
            )}
        </div>
        <div className={styles.listInfo}>
            <span className={styles.listRunnerName}>{pb.username}</span>
            <span className={styles.listGameCategory}>
                {pb.game} &middot; {pb.category}
            </span>
        </div>
        <div className={styles.listRight}>
            <span className={styles.listTimeRow}>
                <span className={styles.listTime}>
                    <DurationToFormatted duration={pb.time} />
                </span>
                {hasImprovement ? (
                    <span className={styles.listDelta}>
                        &minus;
                        {getFormattedString(
                            improvement.toString(),
                            improvement < 60000,
                        )}
                    </span>
                ) : pb.previousPb === null ? (
                    <span className={styles.listFirstPb}>
                        <FaStar size={9} aria-hidden="true" /> First PB!
                    </span>
                ) : null}
            </span>
            <span className={styles.listTimestamp}>
                <FromNow time={pb.endedAt} />
            </span>
        </div>
    </Link>
);
```

**Step 3: Add new SCSS styles**

Replace the existing `.listAvatar` style and add new thumbnail styles. In `pb-feed.module.scss`, replace the `.listAvatar` block with:

```scss
.listThumbWrap {
    position: relative;
    flex-shrink: 0;
    width: 36px;
    height: 48px;
}

.listGameThumb {
    width: 36px;
    height: 48px;
    object-fit: cover;
    border-radius: 4px;
}

.listGameThumbFallback {
    width: 36px;
    height: 48px;
    border-radius: 4px;
    background: color-mix(in srgb, var(--bs-secondary-bg) 50%, transparent);
}

.listAvatarOverlay {
    position: absolute;
    bottom: -4px;
    right: -6px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid var(--bs-body-bg);
}
```

**Step 4: Verify build**

Run: `npm run typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add app/(new-layout)/frontpage/sections/pb-feed-client.tsx app/(new-layout)/frontpage/sections/pb-feed.module.scss
git commit -m "feat: add game thumbnails with avatar overlay to PB feed rows"
```

---

### Task 3: Increase feed to 15 items

**Files:**
- Modify: `app/(new-layout)/frontpage/sections/pb-feed-section.tsx`

**Step 1: Change the getRecentPBs limit**

In `pb-feed-section.tsx` line 12, change:

```tsx
getRecentPBs(10),
```

to:

```tsx
getRecentPBs(15),
```

**Step 2: Verify build**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add app/(new-layout)/frontpage/sections/pb-feed-section.tsx
git commit -m "feat: increase PB feed from 10 to 15 items"
```

---

### Task 4: Clean up unused styles

**Files:**
- Modify: `app/(new-layout)/frontpage/sections/pb-feed.module.scss`

**Step 1: Remove the old `.listAvatar` style**

The `.listAvatar` class (lines 345-352 in current scss) is no longer referenced after Task 2. Remove it.

**Step 2: Verify build**

Run: `npm run typecheck && npm run lint`
Expected: PASS

**Step 3: Commit**

```bash
git add app/(new-layout)/frontpage/sections/pb-feed.module.scss
git commit -m "chore: remove unused listAvatar style"
```

---

### Task 5: Visual verification

**Step 1: Run dev server**

Run: `npm run dev`

**Step 2: Verify in browser**

Check:
- Carousel slides are clickable → navigate to `/{username}`
- Swiping/dragging a carousel slide does NOT navigate (only clean taps)
- Feed rows show game thumbnail (36x48) with runner avatar overlapping bottom-right
- Feed rows without game images show a subtle fallback rectangle
- Feed shows 15 items
- Responsive: check at 480px and 768px breakpoints
- Dark/light theme both look correct

**Step 3: Final commit if any tweaks needed**
