const fs = require("fs");
const { base64Decode } = require("./utils");

async function decodeUrls() {
  const links = JSON.parse(
    fs.readFileSync("./output/input-base64.json", {
      encoding: "utf-8",
    })
  );

  const linksBase64 = links
    .filter((link) => link.match(/out\/\?.*/))
    .map((link) => {
      const base64Url = link.split("out/?")[1];
      return base64Decode(base64Url);
    })
    .filter((link) => link.match(/mega.nz|dropbox/));

  console.log(linksBase64);

  console.log({
    totalLinks: links.length,
    linksBase64: linksBase64.length,
  });

  fs.writeFileSync(
    `./output/output-base64-decode.json`,
    JSON.stringify(linksBase64)
  );
  console.log("Scraping complete!");
}

const start = performance.now();

decodeUrls().then(() => {
  const end = performance.now() - start;
  console.log(`process finished. it took ${end} ms`);
});
