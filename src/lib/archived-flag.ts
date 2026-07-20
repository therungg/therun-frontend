// Transition shim for the backend's active -> archived rename: reads the
// new field when the API serves it, else inverts legacy `active`. Delete
// the fallback once the backend stops serving `active`.
export function normalizeArchived(row: {
    active?: boolean | null;
    archived?: boolean | null;
}): boolean {
    return row.archived ?? !(row.active ?? true);
}
