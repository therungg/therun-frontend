import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface OpenApiSpec {
    /** Stable id derived from the filename, used as the Scalar source slug. */
    slug: string;
    /** Human label for the source selector. */
    title: string;
    /** Raw YAML/JSON document, passed to Scalar as `content`. */
    content: string;
}

const SPECS_DIR = join(process.cwd(), 'docs', 'openapi');
const SPEC_EXTENSIONS = ['.yaml', '.yml', '.json'];

/** "leaderboards" -> "Leaderboards", "mod-actions" -> "Mod Actions". */
function humanize(fileBaseName: string): string {
    return fileBaseName
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Reads every OpenAPI document in `docs/openapi/` server-side. The contents are
 * only ever handed to the admin-gated API docs page, so specs are never exposed
 * at a public static URL. Returns specs sorted by title for a stable selector.
 */
export async function getOpenApiSpecs(): Promise<OpenApiSpec[]> {
    let entries: string[];
    try {
        entries = await readdir(SPECS_DIR);
    } catch {
        return [];
    }

    const files = entries.filter((name) =>
        SPEC_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext)),
    );

    const specs = await Promise.all(
        files.map(async (name) => {
            const base = name.replace(/\.(ya?ml|json)$/i, '');
            const content = await readFile(join(SPECS_DIR, name), 'utf8');
            return { slug: base, title: humanize(base), content };
        }),
    );

    return specs.sort((a, b) => a.title.localeCompare(b.title));
}
