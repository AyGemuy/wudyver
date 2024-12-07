import axios from "axios";
import * as cheerio from "cheerio";

class InDown {
  async downloadMedia(instagramLink) {
    try {
      const { data: html, headers } = await axios.get("https://indown.io/id", { withCredentials: true });
      const cookies = headers["set-cookie"].join("; ");
      const $ = cheerio.load(html);
      const formAction = $("form#downloadForm").attr("action");
      const inputValues = Object.fromEntries(
        $("form#downloadForm input[name]")
          .get()
          .map((element) => [
            $(element).attr("name"),
            $(element).val() || "",
          ])
      );
      inputValues.link = instagramLink;

      const { data: responseData } = await axios.post(formAction, new URLSearchParams(inputValues), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: cookies,
        },
        withCredentials: true,
      });

      const $$ = cheerio.load(responseData);
      const mediaSet = new Set();

      $$("div.container.mt-4#result div.row.justify-content-center div.col-md-4").map((_, el) => {
        const mediaLink = $$(el);
        const type = mediaLink.find("a.image-link").length > 0 ? "image" : "video";
        const href =
          decodeURIComponent(
            mediaLink
              .find(
                "image" === type
                  ? "div.mt-2.mb-2.text-center a"
                  : "div video source"
              )
              .attr("href")
          ) ?? "";
        const alternative =
          mediaLink
            .find(
              "image" === type
                ? "a.image-link"
                : "div.mt-3.text-center div.btn-group-vertical a"
            )
            .attr("href") ?? "";
        mediaSet.add({
          type: type,
          href: href,
          alternative: alternative,
        });
      });

      return [...mediaSet];
    } catch (error) {
      console.error("Error on indown.io/id:", error);
      console.log("Attempting to fetch from indown.io/es...");
      return await this.downloadMediaFallback(instagramLink);
    }
  }

  async downloadMediaFallback(instagramLink) {
    try {
      const res = await fetch("https://indown.io/es", {
        headers: {
          "sec-ch-ua": '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          "upgrade-insecure-requests": "1",
          Referer: "https://indown.io/es",
          "Referrer-Policy": "strict-origin-when-cross-origin",
        },
      });

      const cookies = res.headers.raw()["set-cookie"] || [];
      const cleanedCookies = cookies.map((cookie) => cookie.split(";")[0]).join("; ");

      const html = await res.text();
      const $ = cheerio.load(html);
      const _token = $('input[name="_token"]').val();
      const p = $('input[name="p"]').val();

      const dlres = await fetch("https://indown.io/download", {
        method: "POST",
        headers: {
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Content-Type": "application/x-www-form-urlencoded",
          cookie: cleanedCookies,
          Referer: "https://indown.io/es",
        },
        body: new URLSearchParams({
          referer: "https://indown.io/es",
          locale: "es",
          p,
          _token,
          link: instagramLink,
        }).toString(),
      });

      const dlhtml = await dlres.text();
      const $$ = cheerio.load(dlhtml);
      const media = [];

      $$("div.mt-2.mb-2, div.mt-3").each((index, element) => {
        const buttonTitle = $$(element)
          .find(".btn.btn-outline-primary")
          .first()
          .text()
          .trim()
          .replace(/\s+/g, " ");
        const type =
          buttonTitle === "Descargar"
            ? "image"
            : buttonTitle === "Servidor de descarga 1"
            ? "video"
            : "";
        const href = $$(element).find("a").first().attr("href");
        if (href) {
          media.push({ type, url: href });
        }
      });

      if (media.length === 0) {
        return {
          status: false,
          msg: "No results found.",
        };
      }

      return {
        status: true,
        result: {
          media,
        },
      };
    } catch (e) {
      console.error("Error on indown.io/es:", e);
      return { status: false, msg: e.message };
    }
  }
}

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) return res.status(400).json({ message: "No url provided" });

  const inDown = new InDown();
  try {
    const result = await inDown.downloadMedia(url);
    return res.status(200).json(typeof result === "object" ? result : result);
  } catch (error) {
    console.error("Error during media download:", error);
    return res.status(500).json({ message: "Error during media download", error: error.message });
  }
}