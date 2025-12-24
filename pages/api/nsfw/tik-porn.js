import axios from "axios";
class TikApi {
  constructor(opts = {}) {
    this.baseURL = opts.url || "https://apiv2.tik.porn";
    this.token = opts.token || null;
    this.cfg = {
      guest: "/auth/guest",
      video_recomendation: "/getvideorecomendation",
      video_info: "/getvideoinfo",
      videos_info: "/getvideosinfo",
      popular_videos: "/videos/popular",
      next_videos: "/getnextvideos",
      read_video: "/readvideo",
      share_video: "/sharevideo",
      recent_videos: "/getrecentvideos",
      best_slide: "/gethomepagebest",
      video_comments: "/getvideocomments",
      comment_replies: "/getcommentreplies",
      explore_page_data: "/getexplorepagedata",
      related_videos: "/getrelatedvideos",
      related_tag_videos: "/getrelatedtagvideos",
      initial_profile_related_videos: "/getinitialprofilerelatedvideos",
      profile_related_videos: "/getprofilerelatedvideos",
      user_rating_videos: "/getuserratingvideos",
      user_uploaded_videos: "/getuseruploadedvideos",
      user_following_data: "/getuserfollowingdata",
      user_by_slug: "/getuserbyslug",
      live_cams_by_slug: "/getlivecamsbyslug",
      live_cam_by_slug: "/getlivecambyslug",
      live_cam_3fold: "https://ratecams.tik.porn/feed/getindexed",
      live_cam_online: "https://ratecams.tik.porn/feed/getcam",
      top_pornstars: "/gettoppornstars",
      pornstar_by_slug: "/getpornstarbyslug",
      top_producers: "/gettopstudios",
      producer_by_slug: "/getproducerbyslug",
      action_list: "/getactionlist",
      top_actions: "/gettopactions",
      action_by_slug: "/getactionbyslug",
      tag_list: "/gettaglist",
      top_tags: "/gettoptags",
      tag_by_slug: "/gettagbyslug",
      metadata: "/getmetadata",
      following_info: "/getfollowinginfo",
      mentions_data: "/getmentionsdata",
      profile_faqs: "/getprofilefaqs",
      profile_schema_data: "/getprofileschemadata",
      initial_listing: "/getinitiallisting",
      listing_search: "/getlistingsearch"
    };
    this.headers = {
      origin: "https://tik.porn",
      referer: "https://tik.porn/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      accept: "application/json",
      "accept-language": "id-ID",
      "content-type": "application/json",
      ...opts.headers
    };
  }
  log(msg, type = "INFO") {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] [${type}] ${msg}`);
  }
  async req({
    method = "GET",
    path,
    data = null,
    params = null,
    headers = {}
  }) {
    if (!this.token && path !== this.cfg.guest) {
      this.log("Token missing, performing auto-guest auth...", "AUTH");
      await this.guest();
    }
    this.log(`${method} -> ${path}...`);
    try {
      const authHead = this.token ? {
        authorization: `Bearer ${this.token}`
      } : {};
      const url = path.startsWith("http") ? path : `${this.baseURL}${path}`;
      const config = {
        method: method,
        url: url,
        headers: {
          ...this.headers,
          ...authHead,
          ...headers
        },
        data: data || undefined,
        params: params || undefined
      };
      const res = await axios(config);
      this.log(`Status: ${res?.status || 0}`, "OK");
      console.log(res?.data);
      return res?.data;
    } catch (e) {
      const errMsg = e?.response?.data?.message || e?.message || "Unknown Error";
      this.log(errMsg, "ERR");
      return null;
    }
  }
  async guest(opts = {}) {
    const res = await this.req({
      method: "POST",
      path: this.cfg.guest,
      data: {
        withCredentials: true,
        ...opts
      }
    });
    if (res?.accesstoken) {
      this.token = res.accesstoken;
      this.log("Guest Token Obtained", "AUTH");
    }
    return res;
  }
  async video_recomendation(params = {}) {
    return await this.req({
      method: "GET",
      path: this.cfg.video_recomendation,
      params: params
    });
  }
  async video_info({
    videoid,
    ...rest
  } = {}) {
    return await this.req({
      method: "GET",
      path: this.cfg.video_info,
      params: {
        videoid: videoid,
        ...rest
      }
    });
  }
  async videos_info({
    video_ids,
    ...rest
  } = {}) {
    return await this.req({
      method: "GET",
      path: this.cfg.videos_info,
      params: {
        video_ids: video_ids,
        ...rest
      }
    });
  }
  async popular_videos(params = {}) {
    return await this.req({
      method: "GET",
      path: this.cfg.popular_videos,
      params: params
    });
  }
  async next_videos({
    amount = 12,
    filter = [],
    sfw = 0,
    ...rest
  } = {}) {
    return await this.req({
      method: "POST",
      path: this.cfg.next_videos,
      data: {
        amount: amount,
        filter: filter?.length ? filter : [1123732, 393646],
        sfw_mode: sfw,
        forcerand: false,
        first_chunk: false,
        ...rest
      }
    });
  }
  async read_video({
    video_id,
    ...rest
  } = {}) {
    return await this.req({
      method: "POST",
      path: this.cfg.read_video,
      data: {
        video_id: video_id,
        ...rest
      }
    });
  }
  async share_video({
    video_id,
    ...rest
  } = {}) {
    return await this.req({
      method: "POST",
      path: this.cfg.share_video,
      data: {
        video_id: video_id,
        ...rest
      }
    });
  }
  async recent_videos(params = {}) {
    return await this.req({
      method: "GET",
      path: this.cfg.recent_videos,
      params: params
    });
  }
  async best_slide(params = {}) {
    return await this.req({
      method: "GET",
      path: this.cfg.best_slide,
      params: params
    });
  }
  async video_comments({
    videoid,
    limit = 10,
    offset = 0,
    ...rest
  } = {}) {
    return await this.req({
      method: "GET",
      path: this.cfg.video_comments,
      params: {
        videoid: videoid,
        limit: limit,
        offset: offset,
        ...rest
      }
    });
  }
  async comment_replies({
    comment_id,
    limit = 10,
    ...rest
  } = {}) {
    return await this.req({
      method: "GET",
      path: this.cfg.comment_replies,
      params: {
        comment_id: comment_id,
        limit: limit,
        ...rest
      }
    });
  }
  async explore_page_data(params = {}) {
    return await this.req({
      method: "GET",
      path: this.cfg.explore_page_data,
      params: params
    });
  }
  async related_videos({
    videoid,
    ...rest
  } = {}) {
    return await this.req({
      method: "GET",
      path: this.cfg.related_videos,
      params: {
        videoid: videoid,
        ...rest
      }
    });
  }
  async related_tag_videos({
    tagid,
    limit = 10,
    ...rest
  } = {}) {
    return await this.req({
      method: "GET",
      path: this.cfg.related_tag_videos,
      params: {
        tagid: tagid,
        limit: limit,
        ...rest
      }
    });
  }
  async initial_profile_related_videos(params = {}) {
    return await this.req({
      method: "GET",
      path: this.cfg.initial_profile_related_videos,
      params: params
    });
  }
  async profile_related_videos(params = {}) {
    return await this.req({
      method: "GET",
      path: this.cfg.profile_related_videos,
      params: params
    });
  }
  async user_rating_videos(params = {}) {
    return await this.req({
      method: "GET",
      path: this.cfg.user_rating_videos,
      params: params
    });
  }
  async user_uploaded_videos({
    user_id,
    limit = 12,
    offset = 0,
    ...rest
  } = {}) {
    return await this.req({
      method: "GET",
      path: this.cfg.user_uploaded_videos,
      params: {
        user_id: user_id,
        limit: limit,
        offset: offset,
        ...rest
      }
    });
  }
  async user_following_data(params = {}) {
    return await this.req({
      method: "GET",
      path: this.cfg.user_following_data,
      params: params
    });
  }
  async user_by_slug({
    slug,
    ...rest
  } = {}) {
    return await this.req({
      method: "GET",
      path: this.cfg.user_by_slug,
      params: {
        slug: slug,
        ...rest
      }
    });
  }
  async live_cams_by_slug({
    slug,
    ...rest
  } = {}) {
    return await this.req({
      method: "GET",
      path: this.cfg.live_cams_by_slug,
      params: {
        slug: slug,
        ...rest
      }
    });
  }
  async live_cam_by_slug({
    slug,
    ...rest
  } = {}) {
    return await this.req({
      method: "GET",
      path: this.cfg.live_cam_by_slug,
      params: {
        slug: slug,
        ...rest
      }
    });
  }
  async live_cam_3fold(params = {}) {
    return await this.req({
      method: "GET",
      path: this.cfg.live_cam_3fold,
      params: params
    });
  }
  async live_cam_online(params = {}) {
    return await this.req({
      method: "GET",
      path: this.cfg.live_cam_online,
      params: params
    });
  }
  async top_pornstars(params = {}) {
    return await this.req({
      method: "GET",
      path: this.cfg.top_pornstars,
      params: params
    });
  }
  async pornstar_by_slug({
    slug,
    ...rest
  } = {}) {
    return await this.req({
      method: "GET",
      path: this.cfg.pornstar_by_slug,
      params: {
        slug: slug,
        ...rest
      }
    });
  }
  async top_producers(params = {}) {
    return await this.req({
      method: "GET",
      path: this.cfg.top_producers,
      params: params
    });
  }
  async producer_by_slug({
    slug,
    ...rest
  } = {}) {
    return await this.req({
      method: "GET",
      path: this.cfg.producer_by_slug,
      params: {
        slug: slug,
        ...rest
      }
    });
  }
  async action_list(params = {}) {
    return await this.req({
      method: "GET",
      path: this.cfg.action_list,
      params: params
    });
  }
  async top_actions(params = {}) {
    return await this.req({
      method: "GET",
      path: this.cfg.top_actions,
      params: params
    });
  }
  async action_by_slug({
    slug,
    ...rest
  } = {}) {
    return await this.req({
      method: "GET",
      path: this.cfg.action_by_slug,
      params: {
        slug: slug,
        ...rest
      }
    });
  }
  async tag_list(params = {}) {
    return await this.req({
      method: "GET",
      path: this.cfg.tag_list,
      params: params
    });
  }
  async top_tags(params = {}) {
    return await this.req({
      method: "GET",
      path: this.cfg.top_tags,
      params: params
    });
  }
  async tag_by_slug({
    slug,
    ...rest
  } = {}) {
    return await this.req({
      method: "GET",
      path: this.cfg.tag_by_slug,
      params: {
        slug: slug,
        ...rest
      }
    });
  }
  async metadata(params = {}) {
    return await this.req({
      method: "GET",
      path: this.cfg.metadata,
      params: params
    });
  }
  async following_info(params = {}) {
    return await this.req({
      method: "GET",
      path: this.cfg.following_info,
      params: params
    });
  }
  async mentions_data(params = {}) {
    return await this.req({
      method: "GET",
      path: this.cfg.mentions_data,
      params: params
    });
  }
  async profile_faqs(params = {}) {
    return await this.req({
      method: "GET",
      path: this.cfg.profile_faqs,
      params: params
    });
  }
  async profile_schema_data(params = {}) {
    return await this.req({
      method: "GET",
      path: this.cfg.profile_schema_data,
      params: params
    });
  }
  async initial_listing(params = {}) {
    return await this.req({
      method: "GET",
      path: this.cfg.initial_listing,
      params: params
    });
  }
  async listing_search({
    q,
    ...rest
  } = {}) {
    return await this.req({
      method: "GET",
      path: this.cfg.listing_search,
      params: {
        q: q,
        ...rest
      }
    });
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["guest", "video_recomendation", "video_info", "videos_info", "popular_videos", "next_videos", "read_video", "share_video", "recent_videos", "best_slide", "video_comments", "comment_replies", "explore_page_data", "related_videos", "related_tag_videos", "initial_profile_related_videos", "profile_related_videos", "user_rating_videos", "user_uploaded_videos", "user_following_data", "user_by_slug", "live_cams_by_slug", "live_cam_by_slug", "live_cam_3fold", "live_cam_online", "top_pornstars", "pornstar_by_slug", "top_producers", "producer_by_slug", "action_list", "top_actions", "action_by_slug", "tag_list", "top_tags", "tag_by_slug", "metadata", "following_info", "mentions_data", "profile_faqs", "profile_schema_data", "initial_listing", "listing_search"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      actions: validActions
    });
  }
  const api = new TikApi();
  try {
    let response;
    switch (action) {
      case "guest":
        response = await api.guest();
        break;
      case "listing_search":
        if (!params.q) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'q' wajib diisi untuk action 'listing_search'."
          });
        }
        response = await api.listing_search(params);
        break;
      case "video_info":
      case "related_videos":
      case "video_comments":
      case "read_video":
      case "share_video":
        if (!params.videoid && !params.video_id) {
          const id = params.videoid || params.video_id;
          if (!id) return res.status(400).json({
            status: false,
            error: `Parameter 'videoid' wajib diisi untuk action '${action}'.`
          });
        }
        response = await api[action](params);
        break;
      case "user_by_slug":
      case "pornstar_by_slug":
      case "producer_by_slug":
      case "tag_by_slug":
      case "action_by_slug":
      case "live_cams_by_slug":
      case "live_cam_by_slug":
        if (!params.slug) {
          return res.status(400).json({
            status: false,
            error: `Parameter 'slug' wajib diisi untuk action '${action}'.`
          });
        }
        response = await api[action](params);
        break;
      case "next_videos":
      case "popular_videos":
      case "recent_videos":
      case "best_slide":
      case "top_pornstars":
      case "top_tags":
      case "metadata":
        response = await api[action](params);
        break;
      default:
        if (validActions.includes(action) && typeof api[action] === "function") {
          response = await api[action](params);
        } else {
          return res.status(400).json({
            status: false,
            error: `Action tidak valid: ${action}.`,
            valid_actions: validActions
          });
        }
        break;
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}