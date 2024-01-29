// General
import * as fs from "fs";
import morgan from "morgan";
import path from "path";
import moment from "moment";

// Parsers
import Parser from "@postlight/parser";
import { fileURLToPath } from "url";
import { dirname } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Express
import express from "express";
import bodyParser from "body-parser";

// JSDOM/DOMPurify
import { JSDOM } from "jsdom";
import DOMPurify from "dompurify";

import hbs from "hbs";

hbs.registerPartials(path.join(__dirname, "views"));
hbs.registerHelper("encodeMyString", function (inputData) {
  return new hbs.SafeString(inputData);
});

hbs.registerHelper("ifCond", function (v1, operator, v2, options) {
  switch (operator) {
    case "==":
      return v1 == v2 ? options.fn(this) : options.inverse(this);
    case "===":
      return v1 === v2 ? options.fn(this) : options.inverse(this);
    case "!=":
      return v1 != v2 ? options.fn(this) : options.inverse(this);
    case "!==":
      return v1 !== v2 ? options.fn(this) : options.inverse(this);
    case "<":
      return v1 < v2 ? options.fn(this) : options.inverse(this);
    case "<=":
      return v1 <= v2 ? options.fn(this) : options.inverse(this);
    case ">":
      return v1 > v2 ? options.fn(this) : options.inverse(this);
    case ">=":
      return v1 >= v2 ? options.fn(this) : options.inverse(this);
    case "&&":
      return v1 && v2 ? options.fn(this) : options.inverse(this);
    case "||":
      return v1 || v2 ? options.fn(this) : options.inverse(this);
    default:
      return options.inverse(this);
  }
});

// Constants
const window = new JSDOM("").window;
const purify = DOMPurify(window);
const version = fs
  .readFileSync(__dirname + "/../VERSION")
  .toString()
  .split("-")[1];

// Express
const app = express();
app.use(bodyParser.json({ limit: "20mb" }));
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "hbs");

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
      parsed.formattedPublishedTime = moment(parsed.date_published).format(
        "MMMM Do, YYYY",
      );

      var length = parsed.word_count;

      var words_per_minute_low = 100;
      var words_per_minute_high = 260;

      var reading_slow = Math.ceil(length / words_per_minute_low);
      var reading_fast = Math.ceil(length / words_per_minute_high);

      parsed.readingTime = reading_fast + "-" + reading_slow;

      return res.render(__dirname + "/views/article-template", parsed);
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
app.listen(port, () =>
  log_console(`Article Parser Server v${version} listening on port ${port}!`),
);
