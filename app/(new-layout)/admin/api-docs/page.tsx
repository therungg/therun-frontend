import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { getOpenApiSpecs } from '~src/lib/openapi-specs';
import { ApiDocsClient } from './api-docs-client';

export const metadata = {
    title: 'API Reference',
    robots: { index: false, follow: false },
};

export default async function ApiDocsPage() {
    const user = await getSession();

    // Admins only. notFound() rather than a forbidden message so the route's
    // existence isn't disclosed to non-admins.
    if (!user.roles?.includes('admin')) {
        notFound();
    }

    const specs = await getOpenApiSpecs();

    if (specs.length === 0) {
        return (
            <div className="container py-4">
                <h1 className="h4">API Reference</h1>
                <p className="text-muted">
                    No OpenAPI specs found in <code>docs/openapi/</code>.
                </p>
            </div>
        );
    }

    return <ApiDocsClient specs={specs} />;
}
