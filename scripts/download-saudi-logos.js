import axios from "axios";
import * as cheerio from "cheerio";

async function scrape() {
  try {
    const url = "https://football-logos.cc/saudi-arabia/al-nassr/";
    console.log(`Fetching team page ${url} ...`);
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    const $ = cheerio.load(data);
    const links = [];
    $("a").each((i, el) => {
      const href = $(el).attr("href");
      const text = $(el).text().trim();
      if (href) {
        links.push({ href, text });
      }
    });

    const svgs = links.filter(l => l.href.includes(".svg"));
    const pngs = links.filter(l => l.href.includes(".png"));

    console.log(`Found ${svgs.length} SVG links:`);
    svgs.forEach((l, idx) => console.log(`${idx + 1}: [${l.text}] -> ${l.href}`));

    console.log(`\nFound ${pngs.length} PNG links:`);
    pngs.forEach((l, idx) => console.log(`${idx + 1}: [${l.text}] -> ${l.href}`));

    console.log("\nAll links containing 'assets' or 'download':");
    links.filter(l => l.href.includes("assets") || l.href.includes("download") || l.href.includes("logo")).forEach((l, idx) => {
      console.log(`${idx + 1}: [${l.text}] -> ${l.href}`);
    });
  } catch (err) {
    console.error("Scraping error:", err.message);
  }
}

scrape();
