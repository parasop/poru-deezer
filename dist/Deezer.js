"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Deezer = void 0;
const poru_1 = require("poru");
const undici_1 = require("undici");
const DEEZER_MEDIA_URL = "https://media.deezer.com/v1";
const DEEZER_SHARE_LINK = "https://deezer.page.link/";
const DEEZER_PUBLIC_API = "https://api.deezer.com/2.0";
const DEEZER_PRIVATE_API = "https://www.deezer.com/ajax/gw-light.php";
const DEEZER_REGEX = /^(?:https?:\/\/|)?(?:www\.)?deezer\.com\/(?:\w{2}\/)?(track|album|playlist|artist)\/(\d+)/;
const ISRC_PREFIX = "dzisrc:";
class Deezer extends poru_1.Plugin {
    poru;
    _resolve;
    baseURL;
    constructor() {
        super("deezer");
        this.baseURL = DEEZER_PUBLIC_API;
    }
    isDeezerShareLink(url) {
        if (url) {
            return url.startsWith(DEEZER_SHARE_LINK);
        }
        else {
            return false;
        }
    }
    async load(poru) {
        this.poru = poru;
        this._resolve = poru.resolve.bind(poru);
        poru.resolve = this.resolve.bind(this);
    }
    get SourceName() {
        return "deezer";
    }
    check(url) {
        return DEEZER_REGEX.test(url);
    }
    async resolve({ query, source, requester }) {
        if (this.isDeezerShareLink(query)) {
            let newURL = await this.decodeDeezerShareLink(query);
            if (newURL.startsWith('https://www.deezer.com/')) {
                return this.resolve({ query: newURL, requester });
            }
        }
        if (source?.toLowerCase() === "deezer" && !this.check(query))
            return this.getQuerySong(query, requester);
        const [, type, id] = DEEZER_REGEX.exec(query) ?? [];
        switch (type) {
            case "track":
                {
                    return this.getTrack(id, requester);
                }
            case "album":
                {
                    return this.getAlbum(id, requester);
                }
            case "playlist":
                {
                    return this.getPlaylist(id, requester);
                }
            case "artist":
                {
                    return this.getArtist(id, requester);
                }
            default:
                {
                    return this._resolve({ query, source: this.poru?.options.defaultPlatform, requester: requester });
                }
        }
    }
    async getTrack(id, requester) {
        try {
            const track = await this.getData(`/track/${id}`);
            const unresolvedTracks = await this.buildUnresolved(track, requester);
            return this.buildResponse("TRACK_LOADED", [unresolvedTracks]);
        }
        catch (e) {
            return this.buildResponse("LOAD_FAILED", [], undefined, e.body?.error.message ?? e.message);
        }
    }
    async getPlaylist(id, requester) {
        try {
            const playlist = await this.getData(`/playlist/${id}`);
            const unresolvedPlaylistTracks = await Promise.all(playlist.tracks.data.map((x) => this.buildUnresolved(x, requester)));
            return this.buildResponse("PLAYLIST_LOADED", unresolvedPlaylistTracks, playlist.title);
        }
        catch (e) {
            return this.buildResponse("LOAD_FAILED", [], undefined, e.body?.error.message ?? e.message);
        }
    }
    async getArtist(id, requester) {
        try {
            const artistData = await this.getData(`/artist/${id}`);
            const artist = await this.getData(`/artist/${id}/top`);
            await this.getArtistTracks(artist);
            if (artist.data.length === 0)
                return this.buildResponse("LOAD_FAILED", [], undefined, "This artist does not have any top songs");
            const unresolvedArtistTracks = await Promise.all(artist.data.map((x) => this.buildUnresolved(x, requester)));
            return this.buildResponse("PLAYLIST_LOADED", unresolvedArtistTracks, `${artistData.name}'s top songs`);
        }
        catch (e) {
            return this.buildResponse("LOAD_FAILED", [], undefined, e.body?.error.message ?? e.message);
        }
    }
    async getArtistTracks(deezerArtist) {
        let nextPage = deezerArtist.next;
        let pageLoaded = 1;
        while (nextPage) {
            if (!nextPage)
                break;
            const req = await (0, undici_1.fetch)(nextPage);
            const json = await req.json();
            deezerArtist.data.push(...json.data);
            nextPage = json.next;
            pageLoaded++;
        }
    }
    async getQuerySong(query, requester) {
        if (this.check(query))
            return this.resolve(query);
        try {
            let tracks = await this.getData(`/search?q=${encodeURIComponent(query)}`);
            const unresolvedTracks = await Promise.all(tracks.data.map((x) => this.buildUnresolved(x, requester)));
            return this.buildResponse("SEARCH_RESULT", unresolvedTracks);
        }
        catch (e) {
            return this.buildResponse("NO_MATCHES", [], undefined, e.body?.error.message ?? e.message);
        }
    }
    async getAlbum(id, requester) {
        try {
            const album = await this.getData(`/album/${id}`);
            const unresolvedAlbumTracks = await Promise.all(album.tracks.data.map((x) => this.buildUnresolved(x, requester)));
            return this.buildResponse("PLAYLIST_LOADED", unresolvedAlbumTracks, album.title);
        }
        catch (e) {
            return this.buildResponse("LOAD_FAILED", [], undefined, e.body?.error.message ?? e.message);
        }
    }
    async decodeDeezerShareLink(url) {
        let req = await (0, undici_1.fetch)(url, {
            method: 'GET',
            redirect: 'manual',
        });
        if (req.status === 302) {
            const location = req.headers.get('location');
            return location;
        }
    }
    async getData(endpoint) {
        const req = await (0, undici_1.fetch)(`${this.baseURL}/${endpoint}`, {});
        const data = await req.json();
        return data;
    }
    async buildUnresolved(track, requester) {
        console.log(track);
        if (!track)
            throw new ReferenceError("The Deezer track object was not provided");
        return new poru_1.Track({
            track: "",
            info: {
                sourceName: "deezer",
                identifier: track.id,
                isSeekable: true,
                author: track.artist ? track.artist.name : "Unknown",
                length: track.duration,
                isStream: false,
                title: track.title,
                uri: track.link,
                image: track.album.cover_medium,
            },
        }, requester);
    }
    compareValue(value) {
        return typeof value !== "undefined"
            ? value !== null
            : typeof value !== "undefined";
    }
    buildResponse(loadType, tracks, playlistName, exceptionMsg) {
        return Object.assign({
            loadType,
            tracks,
            playlistInfo: playlistName ? { name: playlistName } : {},
        }, exceptionMsg
            ? { exception: { message: exceptionMsg, severity: "COMMON" } }
            : {});
    }
}
exports.Deezer = Deezer;
//# sourceMappingURL=Deezer.js.map