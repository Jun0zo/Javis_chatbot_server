// http://no1sense1.dothome.co.kr/

const express = require("express");
const app = express();
const scraper = require("./my_modules/scraper");
const path = require("path");

app.use(express.json()); //body-parser
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/keyboard", (req, res, next) => {
  res.json({
    type: "buttons",
    buttons: ["자비스 키워드 조회"]
  });
});

app.post("/message", (req, res, next) => {
  const command = req.body.userRequest.utterance;

  scraper.scrape(command).then(result => {
    const responseBody = {
      contents: [
        {
          type: "text",
          text: result
        }
      ]
    };
    res.status(200).send(responseBody);
  });
});

// catch 404 and forward to error handler
app.use((req, res, next) => {
  res.send("404 Not found").status(404);
});

module.exports = app;
