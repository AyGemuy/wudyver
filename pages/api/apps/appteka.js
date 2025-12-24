import axios from "axios";
class AppTeka {
  constructor() {
    this.api = {
      base: "https://appteka.store",
      endpoint: {
        search: "/api/1/app/search",
        userApps: "/api/1/user/app/list",
        appInfo: "/api/1/app/info",
        userProfile: "/api/2/user/profile"
      }
    };
    this.headers = {
      "content-type": "application/json",
      "user-agent": "Postify/1.0.0"
    };
  }
  formatSize(bytes) {
    if (bytes === 0) return "0 Byte";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i))} ${[ "Bytes", "KB", "MB", "GB" ][i]}`;
  }
  formatTime(timestamp) {
    return new Date(timestamp * 1e3).toLocaleDateString();
  }
  extractId(url, type) {
    const match = url?.match(new RegExp(`/${type}/([^/]+)$`));
    return match?.[1] || null;
  }
  isUrl(input, type) {
    if (!input) return {
      valid: false,
      error: `Please provide a valid ${type} input.`
    };
    if (type === "search") {
      return input.length < 2 ? {
        valid: false,
        error: "Search query is too short."
      } : {
        valid: true,
        query: input
      };
    }
    const urlType = type === "info" ? "app" : type === "apps" ? "profile" : type;
    const id = this.extractId(input, urlType);
    return id ? {
      valid: true,
      id: id
    } : {
      valid: false,
      error: `Invalid ${type} link format. Correct format: https://appteka.store/${urlType}/[ID]`
    };
  }
  res(response, type) {
    if (!response?.data || response.status !== 200) {
      const errorMessages = {
        search: "No apps found.",
        info: "App not found.",
        profile: "Profile not found.",
        apps: "User has not uploaded any apps."
      };
      return {
        success: false,
        code: response?.status || 400,
        result: {
          error: response?.status === 404 ? errorMessages[type] : response?.status === 429 ? "Too many requests, please try again later." : "An error occurred."
        }
      };
    }
    return null;
  }
  parse(data, type) {
    const types = {
      app: app => ({
        appId: app.app_id,
        appName: app.label,
        package: app.package,
        version: {
          name: app.ver_name,
          code: app.ver_code
        },
        stats: {
          downloads: app.downloads,
          rating: app.rating
        },
        metadata: {
          size: this.formatSize(app.size),
          rawSize: app.size,
          uploadTime: this.formatTime(app.time),
          timestamp: app.time
        },
        category: {
          id: app.category?.id,
          name: app.category?.name
        },
        developer: {
          userId: app.user_id
        },
        status: {
          fileStatus: app.file_status,
          exclusive: app.exclusive,
          source: `${this.api.base}/app/${app.app_id}`
        }
      }),
      info: meta => ({
        appInfo: {
          size: meta.info.size,
          sha1: meta.info.sha1,
          time: meta.info.time,
          label: meta.info.label,
          package: meta.info.package,
          version: {
            name: meta.info.ver_name,
            code: meta.info.ver_code
          },
          sdkVersion: meta.info.sdk_version,
          permissions: meta.info.permissions,
          downloads: meta.info.downloads,
          downloadTime: meta.info.download_time,
          favorites: meta.info.favorites,
          userId: meta.info.user_id,
          username: meta.info.user_name,
          appId: meta.info.app_id,
          fileStatus: meta.info.file_status,
          android: meta.info.android
        },
        metadata: {
          whatsNew: meta.meta.whats_new,
          description: meta.meta.description,
          category: {
            id: meta.meta.category?.id,
            names: meta.meta.category?.name
          },
          exclusive: meta.meta.exclusive,
          time: meta.meta.time,
          rating: {
            average: meta.meta.rating,
            count: meta.meta.rate_count,
            scores: meta.meta.scores
          },
          tags: meta.meta.tags,
          screenshots: meta.meta.screenshots
        },
        versions: meta.versions?.map(version => ({
          appId: version.app_id,
          version: {
            name: version.ver_name,
            code: version.ver_code
          },
          downloads: version.downloads,
          sdkVersion: version.sdk_version
        })),
        download: {
          link: meta.link,
          expiresIn: meta.expires_in
        },
        web: meta.url
      }),
      profile: profile => ({
        userId: profile.user_id,
        name: profile.name,
        joinTime: profile.join_time,
        lastSeen: profile.last_seen,
        stats: {
          role: profile.role,
          mentorId: profile.mentor_id,
          filesCount: profile.files_count,
          totalDownloads: profile.total_downloads,
          favoritesCount: profile.favorites_count,
          reviewsCount: profile.reviews_count,
          feedCount: profile.feed_count,
          pubsCount: profile.pubs_count,
          subsCount: profile.subs_count
        },
        status: {
          isRegistered: profile.is_registered,
          isVerified: profile.is_verified,
          isSubscribed: profile.is_subscribed
        },
        lastReviews: profile.last_reviews?.map(review => ({
          file: {
            appId: review.file.app_id,
            fileStatus: review.file.file_status,
            size: review.file.size,
            time: review.file.time,
            label: review.file.label,
            package: review.file.package,
            version: {
              name: review.file.ver_name,
              code: review.file.ver_code
            },
            downloads: review.file.downloads,
            userId: review.file.user_id,
            rating: review.file.rating,
            exclusive: review.file.exclusive
          },
          rating: {
            rateId: review.rating.rate_id,
            userId: review.rating.user_id,
            username: review.rating.user_name,
            time: review.rating.time,
            score: review.rating.score,
            text: review.rating.text
          }
        })) || [],
        url: profile.url,
        name_regex: profile.name_regex || null,
        access_list: profile.access_list || [],
        grant_roles: profile.grant_roles || []
      })
    };
    return types[type](data);
  }
  async request({
    input,
    type,
    offset = 0,
    locale = "en",
    count = 20
  }) {
    try {
      console.log("Request started for type:", type);
      const validation = this.isUrl(input, type);
      if (!validation.valid) {
        console.log("Validation failed for input:", input);
        return {
          success: false,
          code: 400,
          result: {
            error: validation.error
          }
        };
      }
      const endpoints = {
        search: {
          url: this.api.endpoint.search,
          params: {
            query: validation.query,
            offset: offset,
            locale: locale,
            count: count
          },
          parser: data => ({
            query: validation.query,
            params: {
              offset: offset,
              locale: locale,
              count: count
            },
            total: data.entries?.length || 0,
            apps: data.entries?.map(app => this.parse(app, "app")) || []
          })
        },
        info: {
          url: this.api.endpoint.appInfo,
          params: {
            app_id: validation.id
          },
          parser: data => this.parse(data, "info")
        },
        profile: {
          url: this.api.endpoint.userProfile,
          params: {
            user_id: validation.id
          },
          parser: data => this.parse(data.profile, "profile")
        },
        apps: {
          url: this.api.endpoint.userApps,
          params: {
            user_id: validation.id,
            offset: offset,
            locale: locale,
            count: count
          },
          parser: data => ({
            profile_link: input,
            params: {
              userId: validation.id,
              offset: offset,
              locale: locale,
              count: count
            },
            total: data.entries?.length || 0,
            apps: data.entries?.map(app => this.parse(app, "app")) || []
          })
        }
      };
      const endpoint = endpoints[type];
      const response = await axios.get(`${this.api.base}${endpoint.url}`, {
        params: endpoint.params,
        headers: this.headers,
        validateStatus: false
      });
      const error = this.res(response, type);
      if (error) {
        console.error("Error response:", error);
        return error;
      }
      console.log("Request successful for type:", type);
      return {
        success: true,
        code: 200,
        result: endpoint.parser(response.data.result)
      };
    } catch (error) {
      console.error("Request failed with error:", error);
      return {
        success: false,
        code: error?.response?.status || 400,
        result: {
          error: error?.response?.data?.message || error.message || "An error occurred."
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.type) {
    return res.status(400).json({
      error: "Type is required"
    });
  }
  const appteka = new AppTeka();
  try {
    const data = await appteka.request(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}