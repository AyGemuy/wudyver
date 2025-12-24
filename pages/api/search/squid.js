import axios from "axios";
class Squid {
  constructor() {
    this.api = axios.create({
      baseURL: "https://eu.qobuz.squid.wtf/api",
      headers: {
        authority: "eu.qobuz.squid.wtf",
        referer: "https://eu.qobuz.squid.wtf/",
        "user-agent": "Postify/1.0.0"
      }
    });
    this.endpoints = {
      search: "/get-music",
      album: "/get-album",
      download: "/download-music"
    };
  }
  fmt(type, data) {
    if (type === "album") {
      return {
        type: "album",
        content: {
          maximum_bit_depth: data.maximum_bit_depth,
          copyright: data.copyright,
          title: data.title,
          version: data.version,
          duration: data.duration,
          parental_warning: data.parental_warning,
          maximum_channel_count: data.maximum_channel_count,
          id: data.id,
          maximum_sampling_rate: data.maximum_sampling_rate,
          articles: data.articles || [],
          release_date_original: data.release_date_original,
          release_date_download: data.release_date_download,
          release_date_stream: data.release_date_stream,
          purchasable: data.purchasable,
          streamable: data.streamable,
          previewable: data.previewable,
          downloadable: data.downloadable,
          displayable: data.displayable,
          purchasable_at: data.purchasable_at,
          streamable_at: data.streamable_at,
          hires: data.hires,
          hires_streamable: data.hires_streamable,
          tracks: data.tracks ? data.tracks.items.map(track => ({
            type: "tracks",
            content: {
              maximum_bit_depth: track.maximum_bit_depth,
              copyright: track.copyright,
              performers: track.performers,
              audio_info: track.audio_info,
              performer: track.performer,
              article_ids: track.article_ids,
              work: track.work,
              isrc: track.isrc,
              title: track.title,
              version: track.version,
              duration: track.duration,
              parental_warning: track.parental_warning,
              track_number: track.track_number,
              maximum_channel_count: track.maximum_channel_count,
              id: track.id,
              media_number: track.media_number,
              maximum_sampling_rate: track.maximum_sampling_rate,
              articles: track.articles,
              release_date_original: track.release_date_original,
              release_date_download: track.release_date_download,
              release_date_stream: track.release_date_stream,
              purchasable: track.purchasable,
              streamable: track.streamable,
              previewable: track.previewable,
              downloadable: track.downloadable,
              displayable: track.displayable,
              purchasable_at: track.purchasable_at,
              streamable_at: track.streamable_at,
              hires: track.hires,
              hires_streamable: track.hires_streamable
            }
          })) : []
        }
      };
    } else {
      return {
        type: "tracks",
        content: {
          maximum_bit_depth: data.maximum_bit_depth,
          copyright: data.copyright,
          performers: data.performers,
          audio_info: data.audio_info,
          performer: data.performer,
          article_ids: data.article_ids,
          work: data.work,
          isrc: data.isrc,
          title: data.title,
          version: data.version,
          duration: data.duration,
          parental_warning: data.parental_warning,
          track_number: data.track_number,
          maximum_channel_count: data.maximum_channel_count,
          id: data.id,
          media_number: data.media_number,
          maximum_sampling_rate: data.maximum_sampling_rate,
          articles: data.articles,
          release_date_original: data.release_date_original,
          release_date_download: data.release_date_download,
          release_date_stream: data.release_date_stream,
          purchasable: data.purchasable,
          streamable: data.streamable,
          previewable: data.previewable,
          downloadable: data.downloadable,
          displayable: data.displayable,
          purchasable_at: data.purchasable_at,
          streamable_at: data.streamable_at,
          hires: data.hires,
          hires_streamable: data.hires_streamable
        }
      };
    }
  }
  isValid(input) {
    const trimmedInput = input?.trim();
    return trimmedInput && trimmedInput.length >= 2 ? {
      valid: true,
      input: trimmedInput
    } : {
      valid: false,
      input: trimmedInput
    };
  }
  id(url) {
    const match = url.match(/\/album\/.*?\/([a-zA-Z0-9]+)$/);
    return match ? match[1] : null;
  }
  qualities(maxBitDepth, maxSampleRate) {
    const qualities = [{
      id: "5",
      label: "MP3 320kbps"
    }, {
      id: "6",
      label: "CD Quality FLAC 16bit/44.1kHz"
    }];
    if (maxBitDepth >= 24) {
      qualities.push({
        id: "7",
        label: "Hi-Res 24bit/96kHz"
      });
      if (maxSampleRate >= 192e3) {
        qualities.push({
          id: "27",
          label: "Hi-Res 24bit/192kHz"
        });
      }
    }
    return qualities;
  }
  isQuality(quality, isAqua) {
    if (!quality) return {
      valid: false
    };
    const valid = isAqua.some(q => q.id === quality);
    return valid ? {
      valid: true,
      quality: quality
    } : {
      valid: false
    };
  }
  async search(query) {
    try {
      const {
        data
      } = await this.api.get(this.endpoints.search, {
        params: {
          q: query,
          offset: 0
        }
      });
      if (!data?.data?.tracks?.items?.length) throw new Error();
      return data.data.tracks.items.map(track => this.fmt("tracks", track));
    } catch (error) {
      return null;
    }
  }
  async getAlbum(id) {
    try {
      const {
        data
      } = await this.api.get(this.endpoints.album, {
        params: {
          album_id: id
        }
      });
      if (!data?.data?.tracks?.items?.length) throw new Error();
      return this.fmt("album", data.data);
    } catch (error) {
      return null;
    }
  }
  async getDlink(trackId, quality, isAqua, retryCount = 3) {
    const aqua = this.isQuality(quality, isAqua);
    if (!aqua.valid) quality = isAqua[isAqua.length - 1].id;
    try {
      const {
        data
      } = await this.api.get(this.endpoints.download, {
        params: {
          track_id: trackId,
          quality: quality
        }
      });
      if (!data?.data?.url) throw new Error();
      return data.data.url;
    } catch (error) {
      if (retryCount > 0 && error.response?.status === 400) {
        const lowerIndex = isAqua.findIndex(q => q.id === quality) - 1;
        if (lowerIndex >= 0) return this.getDlink(trackId, isAqua[lowerIndex].id, isAqua, retryCount - 1);
      }
      return null;
    }
  }
  async download(input, options = {}) {
    const validation = this.isValid(input);
    if (!validation.valid) return null;
    try {
      if (input.includes("qobuz.com/") && input.includes("/album/")) {
        const id = this.id(input);
        if (!id) throw new Error();
        const albumInfo = await this.getAlbum(id);
        if (!albumInfo) throw new Error();
        const {
          maxBitDepth,
          maxSampleRate
        } = albumInfo.content.tracks.reduce((max, track) => ({
          maxBitDepth: Math.max(max.maxBitDepth, track.content.maximum_bit_depth),
          maxSampleRate: Math.max(max.maxSampleRate, track.content.maximum_sampling_rate)
        }), {
          maxBitDepth: 0,
          maxSampleRate: 0
        });
        const isAqua = this.qualities(maxBitDepth, maxSampleRate);
        const tracks = await Promise.all(albumInfo.content.tracks.map(async track => {
          const download = await this.getDlink(track.content.id, options.quality, isAqua);
          return download ? {
            type: "tracks",
            content: {
              ...track.content,
              download: download
            }
          } : null;
        }));
        return {
          ...albumInfo,
          content: {
            ...albumInfo.content,
            tracks: tracks.filter(Boolean)
          }
        };
      } else {
        const tracks = await this.search(validation.input);
        if (!tracks?.length) throw new Error();
        const track = tracks[0];
        const isAqua = this.qualities(track.content.maximum_bit_depth, track.content.maximum_sampling_rate);
        if (options.isAlbum) {
          const albumInfo = await this.getAlbum(track.content.album.id);
          if (!albumInfo) throw new Error();
          const albumTracks = await Promise.all(albumInfo.content.tracks.map(async albumTrack => {
            const download = await this.getDlink(albumTrack.content.id, options.quality, isAqua);
            return download ? {
              type: "tracks",
              content: {
                ...albumTrack.content,
                download: download
              }
            } : null;
          }));
          return {
            ...albumInfo,
            content: {
              ...albumInfo.content,
              tracks: albumTracks.filter(Boolean)
            }
          };
        } else {
          const download = await this.getDlink(track.content.id, options.quality, isAqua);
          return download ? {
            ...track,
            content: {
              ...track.content,
              download: download
            }
          } : null;
        }
      }
    } catch (error) {
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    q,
    input,
    quality,
    isAlbum
  } = req.method === "GET" ? req.query : req.body;
  const squid = new Squid();
  try {
    switch (action) {
      case "search":
        if (!q) return res.status(400).json({
          error: 'Paramenter "q" dibutuhkan.'
        });
        const searchResults = await squid.search(q);
        return searchResults ? res.status(200).json(searchResults) : res.status(500).json({
          error: "Pencarian gagal."
        });
      case "download":
        if (!input) return res.status(400).json({
          error: 'Paramenter "input" dibutuhkan.'
        });
        const downloadOptions = quality ? {
          quality: quality
        } : {};
        if (isAlbum === "true") downloadOptions.isAlbum = true;
        const downloadInfo = await squid.download(input, downloadOptions);
        return downloadInfo ? res.status(200).json(downloadInfo) : res.status(500).json({
          error: "Download gagal."
        });
      default:
        return res.status(400).json({
          error: `Action "${action}" tidak valid.`
        });
    }
  } catch (error) {
    console.error("Terjadi kesalahan:", error);
    return res.status(500).json({
      error: "Kesalahan server."
    });
  }
}