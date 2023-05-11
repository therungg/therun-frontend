export interface TwitchPlayerNonInteractiveMedia {
    channel?: string;
    video?: string;
    collection?: string;
}
export interface TwitchPlayerNonInteractiveOptions {
    autoplay?: boolean;
    muted?: boolean;
    time?: string;
}
export declare const generateUrl: (media: TwitchPlayerNonInteractiveMedia, parent: string | string[], options?: TwitchPlayerNonInteractiveOptions) => string;
//# sourceMappingURL=TwitchPlayerNonInteractive.d.ts.map