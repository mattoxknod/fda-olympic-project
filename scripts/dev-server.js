// Tiny static file server for local testing only (not part of the site).
const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const port = process.argv[2] || 8080;

// charset=utf-8 explicitly on every text type - GitHub Pages sends this by
// default for .html, but not reliably for .js/.css/.json, and without it a
// literal UTF-8 character in source (e.g. the ▲/▼ sort arrows) can render as
// mojibake if the browser falls back to a legacy encoding.
const types = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".csv": "text/csv; charset=utf-8", ".svg": "image/svg+xml; charset=utf-8",
};

http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  const filePath = path.join(root, urlPath);
  if (!filePath.startsWith(root)) { res.writeHead(403); res.end(); return; }
  fs.readFile(filePath, (err, content) => {
    if (err) { res.writeHead(404); res.end("Not found: " + urlPath); return; }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    res.end(content);
  });
}).listen(port, () => console.log(`Serving ${root} on http://localhost:${port}`));
