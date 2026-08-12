import { redirect } from 'next/navigation';
import { buildSubmitHref } from '~src/lib/board-url';
import { buildSubcategoryKey } from './subcategory-key';

interface PageProps {
    params: Promise<{ game: string }>;
    searchParams: Promise<{
        mode?: string;
        category?: string;
        [key: string]: string | undefined;
    }>;
}

/**
 * Submitting is a dialog on the board now, not a page. This route stays as a
 * redirect so links posted before the change — and the `mode=claim` deep
 * links that used to open the claim tab — still land on the right board with
 * the dialog open. `mode` is dropped: submitting and claiming are one flow.
 */
export default async function SubmitRunRedirect({
    params,
    searchParams,
}: PageProps) {
    const { game: slug } = await params;
    const sp = await searchParams;

    const values: Record<string, string> = {};
    for (const [key, raw] of Object.entries(sp)) {
        if (key === 'mode' || key === 'category' || key === 'submit') continue;
        if (typeof raw === 'string' && raw.length > 0) values[key] = raw;
    }

    redirect(
        buildSubmitHref(slug, {
            categorySlug: sp.category,
            subcategoryKey:
                Object.keys(values).length > 0
                    ? buildSubcategoryKey(values)
                    : undefined,
        }),
    );
}
