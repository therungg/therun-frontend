export interface Wrapped {
    user: string;
    "start#end": string;
    version: string;
    status: 0 | 1;
    startedProcessingAt?: number;
    processedAt?: number;
}

export type WrappedWithData = Wrapped & WrappedData;
export type WrappedData = Partial<WrappedDataPoints>;

interface WrappedDataPoints {
    hasEnoughRuns: boolean;
    totalPlaytime: number;
    totalRuns: number;
    totalFinishedRuns: number;
    totalResets: number;
}
