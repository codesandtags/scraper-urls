const axios = require("axios");
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

// Define a function to scrape a URL
async function scrapeUrl(urlString, visitedUrls) {
  if (visitedUrls.has(urlString)) {
    return visitedUrls;
  }

  try {
    visitedUrls.add(urlString);
    const response = await axios.get(urlString);
    const $ = cheerio.load(response.data);
    const htmlContent = $.html();
    const links = $("a")
      .map((i, el) => $(el).attr("href"))
      .get();

    const linksWithPattern = links.filter(
      (link) => link && link.match(specificPattern)
    );

    for (const link of linksWithPattern) {
      specificUrls.add(link);
    }

    const internalLinks = links
      .filter((link) => link && link.match(internalLinkPattern))
      .map((link) => url.resolve(urlString, link));

    for (const link of internalLinks) {
      await scrapeUrl(link, visitedUrls);
    }
  } catch (error) {
    console.log(`I cannot visit the url ${urlString}`);
    console.error(error);
  }

  console.log({
    visitedUrls,
    specificUrls,
  });

  return visitedUrls;
}

// Start the scraping process
const visitedUrls = new Set();
const specificUrls = new Set();
console.log(`starting process ${processName}...`);
console.log(specificPattern);

scrapeUrl(rootUrl, visitedUrls)
  .then((visitedUrls) => {
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
    console.log("Scraping complete!");
  })
  .catch((error) => console.error(error));
