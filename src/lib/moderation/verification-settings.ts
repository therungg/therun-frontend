import type {
    SaveSettingsInput,
    SaveVerificationSettingsResult,
    SettingsPreview,
    VerificationSettingsView,
} from '../../../types/verification-settings.types';
import { meFetch } from './mod-fetch';

const base = (gameId: number) =>
    `/v1/leaderboards/games/${gameId}/verification-settings`;

export function getVerificationSettings(
    sessionId: string,
    gameId: number,
): Promise<VerificationSettingsView> {
    return meFetch(base(gameId), { sessionId });
}

export function previewVerificationSettings(
    sessionId: string,
    gameId: number,
    input: SaveSettingsInput,
): Promise<SettingsPreview> {
    return meFetch(`${base(gameId)}/preview`, {
        sessionId,
        method: 'POST',
        body: input,
    });
}

export function saveVerificationSettings(
    sessionId: string,
    gameId: number,
    input: SaveSettingsInput,
): Promise<SaveVerificationSettingsResult> {
    return meFetch(base(gameId), { sessionId, method: 'PUT', body: input });
}
