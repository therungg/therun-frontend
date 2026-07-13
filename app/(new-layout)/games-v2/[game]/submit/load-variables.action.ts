'use server';

import { getVariables } from '~src/lib/leaderboards-v1';
import type {
    ValidCombinations,
    VariableDef,
} from '../../../../../types/leaderboards.types';

/**
 * Category-change fetch path for the submit form. Wraps the same public
 * merged-variables endpoint the board filter uses (`getVariables`), so the
 * form and the board resolve variables identically.
 */
export async function loadVariablesAction(
    gameName: string,
    categoryName: string,
): Promise<{
    variables: VariableDef[];
    reservedParams: string[];
    validCombinations: ValidCombinations;
}> {
    return getVariables(gameName, categoryName);
}
