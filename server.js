// Entry point for Render (and for running locally: `node server.js`).
const http = require("http");
const { handler } = require("./addon");

const port = process.env.PORT || 7000;
http.createServer(handler).listen(port, () => {
  console.log(`Addon running: http://localhost:${port}/manifest.json`);
});
