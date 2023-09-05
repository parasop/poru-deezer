import { Poru, ResolveOptions, Track, Plugin } from "poru";
export type loadType = "TRACK_LOADED" | "PLAYLIST_LOADED" | "SEARCH_RESULT" | "NO_MATCHES" | "LOAD_FAILED";
export declare class Deezer extends Plugin {
    poru: Poru;
    private _resolve;
    baseURL: string;
    constructor();
    isDeezerShareLink(url?: string): boolean;
    load(poru: Poru): Promise<void>;
    get SourceName(): string;
    check(url: any): boolean;
    resolve({ query, source, requester }: ResolveOptions): any;
    private getTrack;
    private getPlaylist;
    private getArtist;
    getArtistTracks(deezerArtist: any): Promise<void>;
    getQuerySong(query: any, requester: any): any;
    private getAlbum;
    private decodeDeezerShareLink;
    getData(endpoint: string): Promise<unknown>;
    buildUnresolved(track: any, requester: any): Promise<Track>;
    compareValue(value: any): boolean;
    buildResponse(loadType: loadType, tracks: any, playlistName?: string, exceptionMsg?: string): {
        loadType: loadType;
        tracks: any;
        playlistInfo: {
            name: string;
        } | {
            name?: undefined;
        };
    } & ({
        exception: {
            message: string;
            severity: string;
        };
    } | {
        exception?: undefined;
    });
}
