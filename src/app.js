// General
import * as fs from "fs";

// Parsers
import Parser from "@postlight/parser";
import { Readability } from "@mozilla/readability";

// Express
import express from "express";
import bodyParser from "body-parser";

// Axios
import axios from "axios";
import { JSDOM } from "jsdom";

import morgan from "morgan";

// Express
const app = express();
app.use(bodyParser.json({ limit: "20mb" }));
app.use(bodyParser.urlencoded({ extended: true }));

// Custom Date Format
morgan.format("custom_date", function () {
  var newdate = new Date()
    .toISOString()
    .replace(/T/, " ") // replace T with a space
    .replace(/\..+/, "");

  return newdate;
});

// Logging
app.use(
  morgan(
    "[:custom_date]: :method :url :status :res[content-length] - :response-time ms",
  ),
);

const port = 3000;

app.get("/", (req, res) => {
  return res.status(400).send({
    error: 'POST (not GET) JSON, like so: {"url": "https://url/to/whatever"}',
  }).end;
});

app.post("/", async (req, res) => {
  const url = req.body.url;

  // Check if URL is set
  if (url === undefined || url === "") {
    return res
      .status(400)
      .send({
        error: 'Send JSON, like so: {"url": "https://url/to/whatever"}',
      })
      .end();
  }

  console.log("Fetching " + url + "...");

  axios
    .get(url)
    .then((response) => {
      console.log("Fetched " + url + " successfully");

      const dom = new JSDOM(response.data, {
        url: url,
      });

      // Parse Content
      const parsed = new Readability(dom.window.document).parse();

      console.log("Readability Parsed: " + url + " successfully");

      return {
        parsed: parsed,
        original_content: response.data,
      };
    })
    .then((result) => {
      const readability_content = result.parsed;

      Parser.parse(url, { html: result.original_content }).then((result) => {
        console.log("Postlight Parsed: " + url + " successfully");

        const parsed = result;

        return res
          .status(200)
          .send({
            url,
            ...parsed,
            readability_content,
          })
          .end();
      });
    })
    .catch((error) => {
      return res
        .status(500)
        .send({
          error: "Some weird error fetching the content",
          details: error,
        })
        .end();
    });
});

// Start server and dump current server version
const version = fs.readFileSync("./VERSION").toString().split("-")[1];

app.listen(port, () =>
  console.log(`Postlight server v${version} listening on port ${port}!`),
);
