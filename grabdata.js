const path = require("path");
const fs = require("fs");
const cheerio = require("cheerio");

const folderPath = "data"
const mapBulan = {
  januari: "01",
  februari: "02",
  maret: "03",
  april: "04",
  mei: "05",
  juni: "06",
  juli: "07",
  agustus: "08",
  september: "09",
  oktober: "10",
  november: "11",
  desember: "12",
};

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed fetch ${url} - status ${res.status}`);
  }

  return res.text();
}

async function scraperData(year) {
  const html = await fetchHtml(`https://tanggalans.com/kalender-${year}/`);
  const $ = cheerio.load(html);
  const data = [];
  $(".kalender-indo").each((i, el) => {
    const $el = $(el);

    // Ambil "Januari 2026" -> pisah nama bulan & tahun
    const titleText = $el.find(".kal-title-link").text().replace(/\s+/g, " ").trim();
    const [bulanRaw, tahun] = titleText.split(" ");
    const kodeBulan = mapBulan[(bulanRaw || "").toLowerCase()];
    if (!kodeBulan || !tahun) return;

    $el.find(".kal-libur-list li").each((j, li) => {
      const $li = $(li);
      const tanggal = $li.find(".kal-libur-day").text().replace(/\s+/g, "").trim();

      if (!tanggal) return; // skip "Bulan Tanpa Libur Nasional"

      const keterangan = $li
        .clone()
        .find(".kal-libur-day")
        .remove()
        .end()
        .text()
        .replace(/\s+/g, " ")
        .trim();

      if (tanggal.includes("-")) {
        const [start, end] = tanggal.split("-").map(Number);
        for (let d = start; d <= end; d++) {
          data.push({
            tanggal: `${tahun}-${kodeBulan}-${d}`,
            keterangan,
          });
        }
      } else {
        data.push({
          tanggal: `${tahun}-${kodeBulan}-${tanggal}`,
          keterangan,
        });
      }
    });
  });

  const foldername = path.join(__dirname, folderPath);
  const filename = `${year}.json`;
  const filePath = path.join(foldername, filename);

  await fs.promises.mkdir(foldername, { recursive: true });
  await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));

  console.log(`File ${filename} success created (${data.length} entry)`);
  return data;
}

async function scraper() {
  console.log("fetch data running..");
  const yearNow = new Date().getFullYear();
  const monthNow = new Date().getMonth() + 1;
  console.log("update new data  " + yearNow);

  if (monthNow === 12) {
    return Promise.all([scraperData(yearNow), scraperData(yearNow + 1)]);
  }

  return scraperData(yearNow);
}

// Biar bisa langsung dijalankan lewat `node grabdata.js` di GitHub Actions
if (require.main === module) {
  scraper()
    .then(() => {
      console.log("Done.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Grab data failed:", err.message || err);
      process.exit(1);
    });
}

module.exports = scraper;
