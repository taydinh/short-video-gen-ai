import axios from "axios";
import * as cheerio from "cheerio";

async function run() {
  try {
    const url = "https://football-logos.cc/saudi-arabia/";
    console.log(`Fetching main page ${url} ...`);
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    const $ = cheerio.load(data);
    const elements = [];
    $("a").each((i, el) => {
      const href = $(el).attr("href");
      const text = $(el).text().trim();
      const img = $(el).find("img").attr("src") || $(el).find("img").attr("data-src");
      if (href) {
        elements.push({ href, text, img });
      }
    });

    console.log(`Total anchors found: ${elements.length}`);
    const teamLinks = elements.filter(el => el.href.includes("/saudi-arabia/") && el.href !== "/saudi-arabia/");
    console.log(`Saudi Arabia specific links: ${teamLinks.length}`);
    teamLinks.slice(0, 40).forEach((el, idx) => {
      console.log(`${idx + 1}: [${el.text}] Href: ${el.href} Img: ${el.img}`);
    });
  } catch (err) {
    console.error("Error:", err.message);
  }
}

run();
