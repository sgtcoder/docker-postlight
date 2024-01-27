// General
import * as fs from "fs";
import morgan from "morgan";

// Parsers
import Mercury from "mercury-parser";
const Parser = Mercury;

// Express
import express from "express";
import bodyParser from "body-parser";

// JSDOM/DOMPurify
import { JSDOM } from "jsdom";
import DOMPurify from "dompurify";

// Constants
const window = new JSDOM("").window;
const purify = DOMPurify(window);

// Express
const app = express();
app.use(bodyParser.json({ limit: "20mb" }));
app.use(bodyParser.urlencoded({ extended: true }));

// Attributes to Whitelist
const WHITELISTED_ATTR = [];

// Tags to Whitelist
const WHITELISTED_TAGS = ["iframe", "video"];

const domPurifyOptions = {
  ADD_ATTR: WHITELISTED_ATTR,
  ADD_TAGS: WHITELISTED_TAGS,
};

function get_date() {
  var newdate = new Date()
    .toISOString()
    .replace(/T/, " ") // replace T with a space
    .replace(/\..+/, "");

  return newdate;
}

function log_console(string) {
  console.log("[" + get_date() + "]: " + string);
}

// Custom Date Format
morgan.format("custom_date", function () {
  return get_date();
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

  log_console("Fetching: " + url + "...");

  Parser.parse(url)
    .then((result) => {
      log_console("Parsed: " + url + " successfully");

      const parsed = result;
      parsed.content = purify.sanitize(parsed.content, domPurifyOptions);

      return res
        .status(200)
        .send({
          url,
          ...parsed,
        })
        .end();
    })
    .catch((error) => {
      log_console(error);

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
  log_console(`Postlight server v${version} listening on port ${port}!`),
);
