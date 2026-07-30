// Hand-mirrored subset of the backend BanRecord
// (therun/src/services/ban-service.ts). Site-wide bans, admin-only API.

export type RunTreatment = 'exclude' | 'anonymize' | 'keep';

export interface SiteBan {
    id: number;
    userId: number;
    username: string;
    reason: string;
    runTreatment: RunTreatment;
    expiresAt: string | null;
    liftedAt: string | null;
}

export interface CreateSiteBanInput {
    username: string;
    reason: string;
    runTreatment: RunTreatment;
}
