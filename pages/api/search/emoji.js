import fetch from "node-fetch";
import * as cheerio from "cheerio";
class EmojiService {
  async getEmojiData({
    provider,
    query,
    detail,
    url
  }) {
    switch (provider) {
      case "1":
        return await this.handleEmojiGraph(query, detail, url);
      case "2":
        return await this.handleEmojiPedia(query);
      case "3":
        return await this.emojiGG(query);
      case "4":
        return await this.emojiAll(query);
      case "5":
        return await this.NotoEmoji(query);
      default:
        throw new Error(`Provider '${provider}' not recognized`);
    }
  }
  async handleEmojiGraph(query, detail, url) {
    if (url) {
      return await this.emojiGraph(url);
    } else if (query) {
      return await this.searchEmoji(query);
    } else {
      throw new Error("Invalid parameters for EmojiGraph");
    }
  }
  async emojiGraph(url) {
    try {
      const response = await fetch(url);
      const html = await response.text();
      const $ = cheerio.load(html);
      return $(".emoji__title").get().map(element => {
        const elm = $(element);
        return {
          name: elm.find(".emoji").text(),
          link: elm.siblings(".emoji__copy").find(".emoji").text(),
          description: elm.siblings("p").text(),
          vendors: elm.siblings(".emoji__div__tablet").find(".block__emoji").get().map(vendorElement => {
            const em = $(vendorElement);
            const vendorName = em.find("a").text();
            const vendorLink = em.find("a")?.attr("href");
            const vendorImage = em.find("img")?.attr("data-src");
            return {
              name: vendorName,
              link: vendorLink ? "https://emojigraph.org" + vendorLink : null,
              image: vendorImage ? "https://emojigraph.org" + vendorImage : null
            };
          })
        };
      });
    } catch (error) {
      console.error("Error in emojiGraph:", error);
      throw error;
    }
  }
  async handleEmojiPedia(query) {
    return await this.emojiPedia(query);
  }
  async emojiPedia(emoji) {
    try {
      const getSlug = await fetch(`https://emojipedia.org/${encodeURIComponent(emoji)}`, {
        redirect: "follow"
      });
      const outSlug = new URL(getSlug.url).pathname.startsWith("/") ? new URL(getSlug.url).pathname.substring(1) : new URL(getSlug.url).pathname;
      const fragments = `
        fragment vendorAndPlatformResource on VendorAndPlatform {
          slug
          title
          description
          items {
            date
            slug
            title
            image {
              source
              description
              useOriginalImage
            }
          }
        }

        fragment emojiResource on Emoji {
          id
          title
          code
          slug
          currentCldrName
          description
        }

        fragment emojiDetailsResource on Emoji {
          ...emojiResource
          vendorsAndPlatforms {
            ...vendorAndPlatformResource
          }
        }
      `;
      const query = `
        query emojiV1($slug: Slug!, $lang: Language) {
          emoji_v1(slug: $slug, lang: $lang) {
            ...emojiDetailsResource
          }
        }
      `;
      const response = await fetch("https://emojipedia.org/api/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query: fragments + query,
          variables: {
            slug: outSlug,
            lang: "EN"
          }
        })
      });
      const data = await response.json();
      const result = data?.data?.emoji_v1?.vendorsAndPlatforms;
      return result ? result.map(v => ({
        name: v.title || v.slug || null,
        description: v.description || v.items?.[0]?.title || null,
        image: "https://em-content.zobj.net/" + v.items?.[0]?.image?.source || null
      })) : [];
    } catch (error) {
      console.error("Error in emojiPedia:", error);
      return [];
    }
  }
  async emojiGG(query) {
    const q = query?.toLowerCase()?.trim()?.split(" ")?.join("_");
    try {
      const response = await fetch("https://emoji.gg/api/");
      const data = await response.json();
      return data.filter(s => s.title === q || s.title?.includes(q))?.length ? data.filter(s => s.title === q || s.title?.includes(q)) : null;
    } catch (error) {
      console.error("Error in EmojiGG:", error);
      return null;
    }
  }
  async NotoEmoji(query) {
    try {
      const key = Array.from(query)[0]?.codePointAt(0)?.toString(16);
      const noto_key = key.toLowerCase().replace(/^([^-]+)-fe0f\b/i, (_, v) => v).replace(/-fe0f$/i, "").replace(/-/g, "_");
      const codePoint = `https://fonts.gstatic.com/s/e/notoemoji/latest/${noto_key}/512.png`;
      return codePoint || null;
    } catch (error) {
      console.error("Error in NotoEmoji:", error);
      return null;
    }
  }
  async emojiAll(query) {
    try {
      const response = await fetch("https://www.emojiall.com/id/emoji/" + query);
      const html = await response.text();
      const $ = cheerio.load(html);
      return {
        emoji: $(".emoji_card_list.pages").eq(0).find(".emoji_font.line").first().text().trim() || null,
        description: $(".emoji_card_list.pages").eq(0).find(".emoji_card_content").first().text().trim() || null,
        vendors: $(".emoji_card_list.pages").eq(3).find("ul.row.no-gutters li").toArray().map(el => {
          const $el = $(el);
          const imgSrc = $el.find("img").attr("data-src");
          return {
            name: $el.find("figcaption").text().trim() || null,
            image: imgSrc ? "https://emojiall.com" + imgSrc.replace(/\/60\//, "/240/") : null
          };
        }).filter(item => item.name && item.image)
      };
    } catch (error) {
      console.error("Error in emojiAll:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const emojiService = new EmojiService();
  try {
    const {
      provider,
      query,
      detail,
      url
    } = req.method === "GET" ? req.query : req.body;
    if (!provider) {
      return res.status(400).json({
        error: "Provider is required"
      });
    }
    const data = await emojiService.getEmojiData({
      provider: provider,
      query: query,
      detail: detail,
      url: url
    });
    return res.status(200).json({
      result: data
    });
  } catch (error) {
    console.error("Error in emoji API:", error);
    res.status(500).json({
      error: "Failed to fetch emoji data"
    });
  }
}