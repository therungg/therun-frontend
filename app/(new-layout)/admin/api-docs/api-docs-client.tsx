'use client';

import { ApiReferenceReact } from '@scalar/api-reference-react';
import '@scalar/api-reference-react/style.css';
import type { OpenApiSpec } from '~src/lib/openapi-specs';

interface Props {
    specs: OpenApiSpec[];
}

export function ApiDocsClient({ specs }: Props) {
    return (
        <ApiReferenceReact
            configuration={{
                theme: 'default',
                // Route "Test Request" through our own admin-gated, same-origin
                // proxy (avoids CORS, injects the caller's session server-side).
                // Relative path keeps the browser request same-origin.
                proxyUrl: '/admin/api-docs/proxy',
                // Default to bearer auth and pre-fill it so there's no manual
                // entry and no "authentication required" nag. The value is a
                // placeholder: the proxy strips it and injects the caller's real
                // session server-side, so the actual token never reaches the
                // browser.
                authentication: {
                    preferredSecurityScheme: 'bearerAuth',
                    securitySchemes: {
                        bearerAuth: {
                            token: 'session-injected-by-proxy',
                        },
                    },
                },
                // One source per spec found in docs/openapi/. The selector only
                // renders when there is more than one.
                sources: specs.map((spec, index) => ({
                    slug: spec.slug,
                    title: spec.title,
                    content: spec.content,
                    default: index === 0,
                })),
            }}
        />
    );
}
