import { Poru, ResolveOptions, Track, Plugin } from "poru";
import { fetch } from "undici";

const DEEZER_MEDIA_URL = "https://media.deezer.com/v1";
const DEEZER_SHARE_LINK = "https://deezer.page.link/"
const DEEZER_PUBLIC_API = "https://api.deezer.com/2.0";
const DEEZER_PRIVATE_API = "https://www.deezer.com/ajax/gw-light.php"
const DEEZER_REGEX = /^(?:https?:\/\/|)?(?:www\.)?deezer\.com\/(?:\w{2}\/)?(track|album|playlist|artist)\/(\d+)/;

const ISRC_PREFIX = "dzisrc:";

export type loadType =
  | "TRACK_LOADED"
  | "PLAYLIST_LOADED"
  | "SEARCH_RESULT"
  | "NO_MATCHES"
  | "LOAD_FAILED";



export class Deezer extends Plugin {

  public poru: Poru;
  private _resolve!: ({ query, source, requester }: ResolveOptions) => any;
  public baseURL: string
  constructor() {
    super("deezer");
    this.baseURL = DEEZER_PUBLIC_API
  }

  public isDeezerShareLink(url?: string) {
    if (url) {
      return url.startsWith(DEEZER_SHARE_LINK);
    } else {
      return false
    }
  }

  public async load(poru: Poru) {
    this.poru = poru;
    this._resolve = poru.resolve.bind(poru);
    poru.resolve = this.resolve.bind(this);
  }

  public get SourceName() {
    return "deezer";
  }

  public check(url) {
    return DEEZER_REGEX.test(url);
  }

  public async resolve({ query, source, requester }: ResolveOptions) {

    if (this.isDeezerShareLink(query)) {
      let newURL: string = await this.decodeDeezerShareLink(query);
      if (newURL.startsWith('https://www.deezer.com/')) {
        return this.resolve({ query: newURL, requester })
      }

    }

    if (source?.toLowerCase() === "deezer" && !this.check(query))
      return this.getQuerySong(query, requester);

    const [, type, id] = DEEZER_REGEX.exec(query) ?? [];


    switch (type) {

      case "track":
        {
          return this.getTrack(id, requester)
        }
      case "album":
        {
          return this.getAlbum(id, requester)
        }
      case "playlist":
        {
          return this.getPlaylist(id, requester)
        }
      case "artist":
        {
          return this.getArtist(id, requester)
        }
      default:
        {
          return this._resolve({ query, source: this.poru?.options.defaultPlatform, requester: requester })
        }

    }

  }


  private async getTrack(id, requester) {
    try {

      const track: any = await this.getData(`/track/${id}`);

      const unresolvedTracks = await this.buildUnresolved(track, requester)

      return this.buildResponse("TRACK_LOADED", [unresolvedTracks]);

    } catch (e) {
      return this.buildResponse(
        "LOAD_FAILED",
        [],
        undefined,
        e.body?.error.message ?? e.message
      );
    }

  }



  private async getPlaylist(id, requester) {
    try {

      const playlist: any = await this.getData(`/playlist/${id}`);

      const unresolvedPlaylistTracks = await Promise.all(
        playlist.tracks.data.map((x) => this.buildUnresolved(x, requester))
      );

      return this.buildResponse("PLAYLIST_LOADED", unresolvedPlaylistTracks, playlist.title);

    } catch (e) {
      return this.buildResponse(
        "LOAD_FAILED",
        [],
        undefined,
        e.body?.error.message ?? e.message
      );
    }

  }


  private async getArtist(id, requester) {
    try {

      const artistData: any = await this.getData(`/artist/${id}`);
      const artist: any = await this.getData(`/artist/${id}/top`);
      await this.getArtistTracks(artist)

      if (artist.data.length === 0) return this.buildResponse("LOAD_FAILED", [], undefined, "This artist does not have any top songs");

      const unresolvedArtistTracks = await Promise.all(
        artist.data.map((x) => this.buildUnresolved(x, requester))
      );

      return this.buildResponse("PLAYLIST_LOADED", unresolvedArtistTracks, `${artistData.name}'s top songs`);

    } catch (e) {
      return this.buildResponse(
        "LOAD_FAILED",
        [],
        undefined,
        e.body?.error.message ?? e.message
      );
    }


  }


  async getArtistTracks(deezerArtist) {
    let nextPage = deezerArtist.next;
    let pageLoaded = 1;
    while (nextPage) {
      if (!nextPage) break;
      const req = await fetch(nextPage);
      const json: any = await req.json();

      deezerArtist.data.push(...json.data);

      nextPage = json.next;
      pageLoaded++;
    }
  }


  async getQuerySong(query, requester) {
    if (this.check(query)) return this.resolve(query);

    try {
      let tracks: any = await this.getData(`/search?q=${encodeURIComponent(query)}`);
      const unresolvedTracks = await Promise.all(
        tracks.data.map((x) => this.buildUnresolved(x, requester))
      );
      return this.buildResponse("SEARCH_RESULT", unresolvedTracks);
    } catch (e) {
      return this.buildResponse(
        "NO_MATCHES",
        [],
        undefined,
        e.body?.error.message ?? e.message
      );
    }
  }





  private async getAlbum(id, requester) {

    try {
      const album: any = await this.getData(`/album/${id}`);

      const unresolvedAlbumTracks = await Promise.all(
        album.tracks.data.map((x) => this.buildUnresolved(x, requester))
      );

      return this.buildResponse("PLAYLIST_LOADED", unresolvedAlbumTracks, album.title);

    } catch (e) {
      return this.buildResponse(
        "LOAD_FAILED",
        [],
        undefined,
        e.body?.error.message ?? e.message
      );
    }

  }

  private async decodeDeezerShareLink(url: string) {

    let req: any = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
    });
    if (req.status === 302) {
      const location = req.headers.get('location');
      return location;
    }





  }


  public async getData(endpoint: string) {

    const req = await fetch(`${this.baseURL}/${endpoint}`, {});
    const data = await req.json();
    return data;

  }


  async buildUnresolved(track, requester) {
    console.log(track)
    if (!track)
      throw new ReferenceError("The Deezer track object was not provided");

    return new Track({
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

  buildResponse(
    loadType: loadType,
    tracks: any,
    playlistName?: string,
    exceptionMsg?: string
  ) {
    return Object.assign(
      {
        loadType,
        tracks,
        playlistInfo: playlistName ? { name: playlistName } : {},
      },
      exceptionMsg
        ? { exception: { message: exceptionMsg, severity: "COMMON" } }
        : {}
    );
  }

}

