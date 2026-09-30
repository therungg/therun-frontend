# Frontend guide — reject options

Feeds the reject dialog's scope picker (this run / select runs / all runs on
the board / ban from category / ban from game). Read-only; the writes are the
existing `POST …/verdicts` (reject) and `POST …/exclude` with a user rule (ban).

## Endpoint

`GET /mod/v1/leaderboards/games/{gameId}/runs/{runId}/reject-options`

Auth: `Authorization: Bearer {sessionId}`; caller needs `verify-reject-run`
on the game (403 otherwise). 404 when `runId` is not a finished run in the game.

Query `without` (optional):
- absent → as if only `runId` were rejected
- `1,2,3` → as if those runs were rejected (max 500; ids not on the board are ignored)
- `all` → as if every listed run were rejected

## Response `{ result: RejectOptions }`

```ts
interface RejectOptions {
    runner: { name: string; userId: number | null; teamKey: string; isCoop: boolean };
    board: { categoryId: number; categoryDisplay: string; subcategoryKey: string };
    /** Non-rejected, non-excluded runs of this team on this board, fastest first (board's primary timing). Max 500. */
    runs: Array<{
        runId: number;
        timeMs: number | null;
        endedAt: string | null;
        status: string;
        isCurrentEntry: boolean;
    }>;
    /** Every id of those runs, uncapped. Submit these for "all runs", 500 per verdicts call. */
    allRunIds: number[];
    /** The team's board entry after the `without` rejects; null = leaves the board. */
    entryAfter:
        | { kind: 'run'; runId: number; timeMs: number; endedAt: string | null }
        | { kind: 'manual'; runId: null; timeMs: number; endedAt: null }
        | null;
    /** Existing user exclusion rules on this game. Always false for guests and co-op. */
    bans: { category: boolean; game: boolean };
}
```

`entryAfter` uses the rebuild's own rule: the entry must have been a PB when
it was run (earlier held runs count), so it can differ from "the next fastest
run in `runs`".

## Behaviour notes

- Guests (`runner.userId === null`) and co-op (`runner.isCoop`) cannot be banned here.
- A ban is quiet: runs are excluded, the runner is not notified; it is lifted
  from the exclusion-rules list.
