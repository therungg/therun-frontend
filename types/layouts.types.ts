export interface LayoutSummary {
    name: string;
    sizeBytes: number;
    uploadedAt: string;
}

export interface MyLayoutsListResponse {
    layouts: LayoutSummary[];
    tier: number;
    cap: number | null;
}

export interface PublicLayoutsListResponse {
    layouts: LayoutSummary[];
}

export type LayoutsListResult =
    | {
          status: 'ok';
          layouts: LayoutSummary[];
          // Owner-only metadata. Null when viewing someone else's layouts.
          tier: number | null;
          cap: number | null;
          viewerIsOwner: boolean;
      }
    | { status: 'not-found' }
    | { status: 'unauthenticated' }
    | { status: 'fetch-failed' };

export type LayoutUploadResult =
    | { status: 'ok'; layout: LayoutSummary }
    | { status: 'invalid-name' }
    | { status: 'empty-body' }
    | { status: 'too-large' }
    | { status: 'cap-reached'; cap: number }
    | { status: 'unauthenticated' }
    | { status: 'fetch-failed' };

export type LayoutDeleteResult =
    | { status: 'ok' }
    | { status: 'not-found' }
    | { status: 'unauthenticated' }
    | { status: 'fetch-failed' };

export type LayoutDownloadResult =
    | { status: 'ok'; downloadUrl: string }
    | { status: 'not-found' }
    | { status: 'unauthenticated' }
    | { status: 'fetch-failed' };

export const LAYOUT_NAME_REGEX = /^[A-Za-z0-9_\-. ]{1,100}$/;
export const LAYOUT_MAX_BYTES = 1024 * 1024;
