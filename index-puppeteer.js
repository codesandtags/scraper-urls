const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const url = require("url");
const fs = require("fs");

require("dotenv").config();

const config = require("./config");

// Define process name
const processName = config.processName;

// Define the root URL to scrape
const rootUrl = config.rootUrl;

// Define the pattern to match for internal links
const internalLinkPattern = new RegExp(config.internalLinkPattern);

// Define specific pattern
const specificPattern = new RegExp(config.specificPattern);

const blockedDomains = [
  "googlesyndication.com",
  "adservice.google.com",
  "googletagmanager.com",
  "assets.website-files.com",
  "assets-global.website-files.com",
];

const minimalArgs = [
  "--autoplay-policy=user-gesture-required",
  "--disable-background-networking",
  "--disable-background-timer-throttling",
  "--disable-backgrounding-occluded-windows",
  "--disable-breakpad",
  "--disable-client-side-phishing-detection",
  "--disable-component-update",
  "--disable-default-apps",
  "--disable-dev-shm-usage",
  "--disable-domain-reliability",
  "--disable-extensions",
  "--disable-features=AudioServiceOutOfProcess",
  "--disable-hang-monitor",
  "--disable-ipc-flooding-protection",
  "--disable-notifications",
  "--disable-offer-store-unmasked-wallet-cards",
  "--disable-popup-blocking",
  "--disable-print-preview",
  "--disable-prompt-on-repost",
  "--disable-renderer-backgrounding",
  "--disable-setuid-sandbox",
  "--disable-speech-api",
  "--disable-sync",
  "--hide-scrollbars",
  "--ignore-gpu-blacklist",
  "--metrics-recording-only",
  "--mute-audio",
  "--no-default-browser-check",
  "--no-first-run",
  "--no-pings",
  "--no-sandbox",
  "--no-zygote",
  "--password-store=basic",
  "--use-gl=swiftshader",
  "--use-mock-keychain",
];

// To avoid rate limit use the next command
// await page.waitFor(5000);

async function takeScreenshot(url, page) {
  const filename = url.replace(/[:/]/g, "_") + ".png";
  await page.screenshot({ path: `./output/${filename}` });
}

function addSpecificUrls(links) {
  const linksWithPattern = links.filter(
    (link) => link && link.match(specificPattern)
  );

  for (const link of linksWithPattern) {
    specificUrls.add(link);
  }
}

// Define a function to scrape a URL
async function scrapeUrl(urlString, visitedUrls, page) {
  if (visitedUrls.has(urlString)) {
    console.log({ "❌ skipped": urlString });
    return visitedUrls;
  }

  console.log({ "🤖 reading": urlString });

  try {
    visitedUrls.add(urlString);

    await page.goto(urlString, { waitUntil: "networkidle2" });
    const htmlContent = await page.content();
    const $ = cheerio.load(htmlContent);
    const links = $("a")
      .map((i, el) => $(el).attr("href"))
      .get();

    console.log("Visited Urls next: ");
    console.log(visitedUrls);

    const internalLinks = new Set(
      links
        .filter((link) => {
          allLinks.add(link);
          return link && link.match(internalLinkPattern);
        })
        .map((link) => url.resolve(urlString, link))
        .filter((link) => !visitedUrls.has(link))
    );

    // console.log({internalLinks,});

    console.log({
      visitedUrls: visitedUrls.size,
      specificUrls: specificUrls.size,
      allLinks: allLinks.size,
    });

    for (const link of [...internalLinks]) {
      await scrapeUrl(link, visitedUrls, page);
    }
  } catch (error) {
    console.log(`I cannot visit the url ${urlString}`);
    console.error(error);
  }

  return visitedUrls;
}

// Start the scraping process
const visitedUrls = new Set();
const specificUrls = new Set();
const allLinks = new Set();

const runProcess = async () => {
  console.log(`starting process ${processName}...`);

  const browser = await puppeteer.launch({
    headless: true,
    args: minimalArgs,
    userDataDir: "./data",
  });
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const url = request.url();
    if (blockedDomains.some((domain) => url.includes(domain))) {
      request.abort();
    } else {
      request.continue();
    }
  });

  return scrapeUrl(rootUrl, visitedUrls, page)
    .then(async (visitedUrls) => {
      console.log("Getting visited URLs", visitedUrls);
      // Write the results to a JSON file
      const results = Array.from(visitedUrls);
      fs.writeFileSync(
        `./output/${processName}-links.json`,
        JSON.stringify(results)
      );

      const resultsWithPattern = Array.from(specificUrls);
      fs.writeFileSync(
        `./output/${processName}-results.json`,
        JSON.stringify(resultsWithPattern)
      );

      const resultsWithAllLinks = Array.from(allLinks);
      fs.writeFileSync(
        `./output/${processName}-all-links.json`,
        JSON.stringify(resultsWithAllLinks)
      );
      console.log("Scraping complete!");

      // Close open browser
      if (browser.isConnected()) {
        await browser.close();
      }

      return;
    })
    .catch((error) => console.error(error));
};

const start = performance.now();
runProcess()
  .then(() => {
    console.log("process finished! :)");
    const end = performance.now() - start;

    console.log(`process took ${end} ms`);
  })
  .catch((error) => console.error(error));
