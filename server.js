const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();

// Route to retrieve the cost of living index for a specific city
app.get("/api/cost-of-living/:city", async (req, res) => {
  const city = req.params.city;

  try {
    const response = await axios.get(
      `https://www.numbeo.com/cost-of-living/in/${city}`
    );
    const html = response.data;
    const $ = cheerio.load(html);

    const trElements = $("tr");
    const trText = trElements
      .map((i, el) => {
        const tdElements = $(el)
          .map(() => {
            return $(el).text();
          })
          .get();

        console.log("columns", tdElements.length);
        return tdElements;
      })
      .get();

    if (trText) {
      res.json({ city, trText });
    } else {
      res
        .status(404)
        .json({ error: `Could not find cost of living index for ${city}` });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log("Server listening on port 3000");
});
