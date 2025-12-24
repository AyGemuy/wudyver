import axios from "axios";
class EmojisAPI {
  constructor() {
    this.client = axios.create({
      baseURL: "https://api.emojis.com/api/graphql",
      headers: {
        accept: "application/graphql-response+json, application/json",
        "accept-language": "id-ID",
        "content-type": "application/json",
        origin: "https://www.emojis.com",
        priority: "u=1, i",
        referer: "https://www.emojis.com/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      },
      timeout: 15e3,
      decompress: true
    });
    this.CAT = {
      EMOJIS: "emojis",
      ICONS: "icons",
      ILLUSTRATIONS: "illustrations",
      ILLUSTRATIONS_3D: "illustrations_3d",
      IMAGES: "images",
      MEMES: "memes",
      OTHER: "other"
    };
    this.DEFAULT_IMG = {
      f: "png",
      q: 90,
      w: 1024
    };
  }
  img(base, {
    f = "png",
    q = 90,
    w = 1024,
    h = null
  } = {}) {
    if (!base) return null;
    const p = [];
    if (f) p.push(`f:${f}`);
    if (q) p.push(`q:${q}`);
    if (w) p.push(`w:${w}`);
    if (h) p.push(`h:${h}`);
    return `https://imgproxy.attic.sh/insecure${p.length ? "/" + p.join("/") : ""}/plain/${base}`;
  }
  fmtBlob(blob, imgOpts = {}) {
    if (!blob) return null;
    const opts = {
      ...this.DEFAULT_IMG,
      ...imgOpts
    };
    return {
      orig: blob.url,
      w: blob.width ?? null,
      h: blob.height ?? null,
      type: blob.__typename,
      transparent: blob.percentageTransparent ?? null,
      var: {
        hd_png: this.img(blob.url, {
          f: "png",
          w: 1024,
          q: 90
        }),
        custom: this.img(blob.url, opts),
        w512: this.img(blob.url, {
          w: 512
        }),
        orig: this.img(blob.url)
      }
    };
  }
  async post(gql, vars = {}, op = null) {
    try {
      console.log(`[API] → ${op}`);
      const {
        data
      } = await this.client.post("", {
        query: gql,
        variables: vars,
        operationName: op
      });
      if (data?.errors) {
        console.error(`[API] GraphQL Errors:`, data.errors);
        return null;
      }
      console.log(`[API] ← Success`);
      return data;
    } catch (e) {
      console.error("Network error:", e.response?.status || e.message);
      return null;
    }
  }
  async search({
    q = "",
    first = 56,
    after = null,
    cat = null,
    order = "recent",
    f = "png",
    q: quality = 90,
    w: width = 1024,
    h: height = null
  } = {}) {
    const validCat = this.CAT[Object.keys(this.CAT).find(k => this.CAT[k] === cat)] || null;
    const imgOpts = {
      f: f,
      q: quality,
      w: width,
      h: height
    };
    const gql = `
      query GetEmojisSearch(
        $query: String, 
        $first: Int, 
        $after: String, 
        $order: SearchEmojiOrder, 
        $modelIds: [ID!], 
        $modelSlugs: [String!], 
        $modelCategory: ModelCategory
      ) {
        searchEmojis(
          query: $query, 
          first: $first, 
          after: $after, 
          order: $order, 
          modelIds: $modelIds, 
          modelSlugs: $modelSlugs, 
          modelCategory: $modelCategory
        ) {
          totalCount
          pageInfo { 
            endCursor 
            hasNextPage 
          }
          nodes { 
            slug 
            id 
            prompt 
            model { 
              id 
              slug 
              category 
            } 
            blob { 
              ...AttachmentFields 
            } 
          }
        }
      }
      fragment AttachmentFields on Attachment { 
        __typename 
        filename 
        contentType 
        id 
        url 
        ... on ImagePngAttachment { 
          width 
          height 
          percentageTransparent 
        } 
        ... on ImageJpegAttachment { 
          width 
          height 
        } 
        ... on ImageWebpAttachment { 
          width 
          height 
        } 
        ... on ImageSvgAttachment { 
          width 
          height 
        } 
        ... on FileAttachment { 
          __typename 
        } 
      }
    `;
    const res = await this.post(gql, {
      query: q || null,
      first: first,
      after: after,
      order: order,
      modelIds: [],
      modelSlugs: [],
      modelCategory: validCat
    }, "GetEmojisSearch");
    const s = res?.data?.searchEmojis;
    if (!s) return null;
    return {
      total: s.totalCount,
      next: s.pageInfo.hasNextPage,
      cursor: s.pageInfo.endCursor,
      items: s.nodes.map(n => ({
        id: n.id,
        slug: n.slug,
        prompt: n.prompt,
        cat: n.model?.category || "unknown",
        model: n.model ? {
          id: n.model.id,
          slug: n.model.slug
        } : null,
        img: this.fmtBlob(n.blob, imgOpts)
      }))
    };
  }
  async models({
    first = 1e3,
    slugs = []
  } = {}) {
    const gql = `
      query GetModels($first: Int, $slugs: [String!]) {
        models(first: $first, slugs: $slugs) {
          nodes {
            id 
            slug 
            name 
            description 
            promptPrefix 
            visibility 
            category 
            createdAt 
            canEdit 
            emojisCount
            supportedAspectRatios 
            supportedBackgrounds 
            supportedQualities
            defaultAspectRatio 
            defaultBackground 
            defaultQuality
            streamChunkStyle 
            totalStreamChunks
            owner { 
              id 
              image 
              username 
            }
            supportsReferenceImages
            referenceImages { 
              id 
              url 
            }
            featuredEmojis(first: 5) {
              nodes { 
                id 
                prompt 
                blob { 
                  ...AttachmentFields 
                } 
              }
            }
          }
        }
      }
      fragment AttachmentFields on Attachment { 
        __typename 
        filename 
        contentType 
        id 
        url 
        ... on ImagePngAttachment { 
          width 
          height 
          percentageTransparent 
        } 
        ... on ImageJpegAttachment { 
          width 
          height 
        } 
        ... on ImageWebpAttachment { 
          width 
          height 
        } 
        ... on ImageSvgAttachment { 
          width 
          height 
        } 
        ... on FileAttachment { 
          __typename 
        } 
      }
    `;
    console.log(`[MODELS] Fetching ${first} models...`);
    const res = await this.post(gql, {
      first: first,
      slugs: slugs
    }, "GetModels");
    const m = res?.data?.models;
    if (!m) return null;
    return m.nodes.map(model => ({
      id: model.id,
      slug: model.slug,
      name: model.name,
      description: model.description,
      promptPrefix: model.promptPrefix,
      visibility: model.visibility,
      cat: model.category,
      createdAt: model.createdAt,
      canEdit: model.canEdit,
      count: model.emojisCount,
      aspectRatios: model.supportedAspectRatios,
      backgrounds: model.supportedBackgrounds,
      qualities: model.supportedQualities,
      defaultAspect: model.defaultAspectRatio,
      defaultBg: model.defaultBackground,
      defaultQuality: model.defaultQuality,
      owner: model.owner ? {
        id: model.owner.id,
        username: model.owner.username,
        image: model.owner.image
      } : null,
      supportsRef: model.supportsReferenceImages,
      refImages: model.referenceImages.map(r => ({
        id: r.id,
        url: r.url
      })),
      featured: model.featuredEmojis.nodes.map(e => ({
        id: e.id,
        prompt: e.prompt,
        img: this.fmtBlob(e.blob)
      }))
    }));
  }
  async related({
    emoji_id: emojiId,
    tags = [],
    first = 56,
    after = null
  } = {}) {
    if (!emojiId) throw new Error("emojiId is required");
    const gql = `
      query GetEmojisRelated(
        $emojiId: ID!, 
        $tags: [String!], 
        $first: Int, 
        $after: String
      ) {
        relatedEmojis(
          emojiId: $emojiId, 
          tags: $tags, 
          first: $first, 
          after: $after
        ) {
          pageInfo { 
            endCursor 
            hasNextPage 
          }
          nodes { 
            slug 
            id 
            prompt 
            model { 
              id 
              slug 
              category 
            } 
            blob { 
              ...AttachmentFields 
            } 
          }
        }
      }
      fragment AttachmentFields on Attachment { 
        __typename 
        filename 
        contentType 
        id 
        url 
        ... on ImagePngAttachment { 
          width 
          height 
          percentageTransparent 
        } 
        ... on ImageJpegAttachment { 
          width 
          height 
        } 
        ... on ImageWebpAttachment { 
          width 
          height 
        } 
        ... on ImageSvgAttachment { 
          width 
          height 
        } 
        ... on FileAttachment { 
          __typename 
        } 
      }
    `;
    console.log(`[RELATED] emojiId: ${emojiId}`);
    const res = await this.post(gql, {
      emojiId: emojiId,
      tags: tags,
      first: first,
      after: after
    }, "GetEmojisRelated");
    const r = res?.data?.relatedEmojis;
    if (!r) return null;
    return {
      next: r.pageInfo.hasNextPage,
      cursor: r.pageInfo.endCursor,
      items: r.nodes.map(n => ({
        id: n.id,
        slug: n.slug,
        prompt: n.prompt,
        cat: n.model?.category || "unknown",
        model: n.model ? {
          id: n.model.id,
          slug: n.model.slug
        } : null,
        img: this.fmtBlob(n.blob)
      }))
    };
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi.",
      actions: ["search", "related", "models"],
      examples: {
        search: "?action=search&query=cat&cat=emojis&first=5",
        related: "?action=related&emoji_id=abc123&first=5",
        models: "?action=models&first=10"
      }
    });
  }
  const api = new EmojisAPI();
  try {
    let response;
    switch (action) {
      case "search":
        if (!params.q && !params.query) {
          return res.status(400).json({
            error: "Parameter 'q' atau 'query' wajib untuk action 'search'.",
            example: "action=search&query=cat&cat=emojis&first=5"
          });
        }
        const searchParams = {
          ...params,
          q: params.q || params.query
        };
        console.log("[ACTION] Searching:", searchParams.q);
        response = await api.search(searchParams);
        break;
      case "related":
        if (!params.emoji_id) {
          return res.status(400).json({
            error: "Parameter 'emoji_id' wajib untuk action 'related'.",
            example: "action=related&emoji_id=gid://851/Emojis::Emoji/abc&first=5"
          });
        }
        console.log("[ACTION] Getting related for:", params.emoji_id);
        response = await api.related(params);
        break;
      case "models":
        console.log("[ACTION] Getting models");
        response = await api.models(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          supported: ["search", "related", "models"],
          examples: {
            search: "?action=search&query=cat&cat=emojis&first=5",
            related: "?action=related&emoji_id=abc123&first=5",
            models: "?action=models&first=10"
          }
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Action '${action}':`, error?.message || error);
    return res.status(500).json({
      error: error?.message || "Terjadi kesalahan internal.",
      action: action,
      params: Object.keys(params)
    });
  }
}