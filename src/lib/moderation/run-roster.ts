import { meFetch } from './mod-fetch';

/**
 * One member of a roster being written. An account by id (`userId`), an
 * account by name (`username` — the server looks it up), or a guest
 * (`name`) — never more than one of these for a single member.
 *
 * A guest is created from the name as typed, always: a `name` sent on its own
 * always writes a guest row, whatever account happens to share that spelling.
 * `username` is how you name an account without its id: the server resolves
 * it and labels the member by the account, never by the spelling sent. Send
 * `username`, not `name`, whenever the name might belong to a real account
 * (guide §2) — `name` is the guest fallback, offered only after the server
 * refuses the `username` with `no account named …`.
 *
 * A member whose account is masked on this board (null `userId`,
 * `isGuest: false`) CANNOT be re-sent by any of these — see
 * `rosterIsEditable`.
 */
export type RosterMemberInput =
    | { userId: number }
    | { username: string }
    | { name: string };

/**
 * Write a run's roster.
 *
 * `participants` is the ONLY field in the body, and that is load-bearing
 * rather than tidy: the backend routes a PUT carrying `participants` and
 * nothing else through a roster-only branch that sits above the moderator
 * gate, which is what lets a runner take themselves off a run they did not
 * file. Slip any other field in — a time, a vod url, even a `reason` that
 * matters elsewhere — and the whole request goes down the moderator path,
 * which demands a 10-character reason and the board's `verify-reject-run`
 * permission, and 403s the runner it was built for.
 * (docs/frontend-guide-co-op-runs.md §2.)
 *
 * Send the WHOLE roster you want the run to end up with: this replaces, it
 * does not patch. `[]` is a real instruction (credit the filer alone); `null`
 * is a 400.
 *
 * `updated: false` means the roster sent was the roster the run already had.
 * That is success, not a call to retry.
 */
export function editRunRoster(
    sessionId: string,
    runId: number,
    participants: RosterMemberInput[],
): Promise<{ updated: boolean }> {
    return meFetch(`/v1/leaderboards/runs/${runId}`, {
        sessionId,
        method: 'PUT',
        body: { participants },
    });
}
