import { createClient } from "@vercel/edge-config";

export type FeatureFlags = "Maintenance_Mode";

/** Feature Flags
  - Support for Vercel Edge Config can be enabled if Environment Variable `EDGE_CONFIG` is present
    Fallbacks to using environment variable when nothing is found in Edge Config
  - Support for loading from environment variables

  Note: Variables are prefixed by `FEATURE_FLAGS_` (ex: `FEATURE_FLAGS_MAINTENANCE_MODE`)
*/
export async function getFeatureFlag(
    key: FeatureFlags,
    defaultValue = false
): Promise<boolean> {
    const prefixedKey = `FEATURE_FLAGS_${key.toUpperCase()}`;
    if (process.env.EDGE_CONFIG !== undefined) {
        const edgeConfig = createClient(process.env.EDGE_CONFIG);

        const featureFlag = await edgeConfig.get<boolean>(prefixedKey);
        // Fallback to environment variables if not found on Edge Config
        if (featureFlag !== undefined) {
            return featureFlag;
        }
    }
    return parseBoolean(process.env[prefixedKey], defaultValue);
}

function parseBoolean(val: any, defVal: boolean) {
    if (val == undefined) {
        return defVal;
    }
    const value = val.toString().toLowerCase().trim();

    if (["true", "yes", "1", "on"].includes(value)) return true;
    if (["false", "no", "0", "off"].includes(value)) return false;

    return defVal;
}
