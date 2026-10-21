// Tiny stand-in for the Platform API: GET /defects returns the seeded fixture,
// POST /__seed/:n swaps the fixture to n generated defects.
import { createServer } from "node:http";

const AREAS = ["Login", "Billing", "Reports", "Checkout", "Profile", "Search"];
const SEVERITIES = ["low", "medium", "high", "critical"];
const STATUSES = ["open", "in_progress", "closed"];

function build(n) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    const d = new Date(Date.UTC(2026, 9, 20));
    d.setUTCDate(d.getUTCDate() - (i - 1));
    out.push({
      id: `DEF-${100 + i}`,
      title: `Defect number ${i}`,
      status: STATUSES[(i * 5 + (i >> 2)) % 3],
      severity: SEVERITIES[(i * 3) % 4],
      area: AREAS[(i * 5) % AREAS.length],
      reportedAt: d.toISOString().slice(0, 10),
      n: i,
    });
  }
  // stored out of order so sorting is visible
  return out.sort((a, b) => ((a.n * 7919) % 13) - ((b.n * 7919) % 13)).map(({ n: _n, ...rest }) => rest);
}

let data = build(45);
let created = 0;
let lastCreated = null;

createServer((req, res) => {
  const seed = /^\/__seed\/(\d+)$/.exec(req.url ?? "");
  if (req.method === "POST" && seed) {
    data = build(Number(seed[1]));
    res.writeHead(204).end();
    return;
  }
  if (req.method === "POST" && req.url === "/defects/attachments") {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("latin1");
      const name = /filename="([^"]*)"/.exec(raw)?.[1] ?? "";
      const reply = (status, body) =>
        res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(body));
      if (name.endsWith(".exe")) {
        reply(415, { message: "That file type is not supported. Choose an image, PDF or text file." });
      } else if (name.includes("fail")) {
        reply(502, { message: "We could not upload that file. Try again or submit without it." });
      } else {
        reply(201, { attachmentId: `ATT-${name}`, name });
      }
    });
    return;
  }
  if (req.method === "POST" && req.url === "/defects") {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      created += 1;
      let body = {};
      try {
        body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch {
        // keep empty body
      }
      lastCreated = { id: `DEF-NEW-${created}`, reporterId: req.headers["x-user-id"] ?? null, body };
      res.writeHead(201, { "content-type": "application/json" }).end(JSON.stringify({ id: lastCreated.id }));
    });
    return;
  }
  if (req.method === "GET" && req.url === "/__last-created") {
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(lastCreated));
    return;
  }
  if (req.method === "GET" && req.url === "/defects") {
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(data));
    return;
  }
  res.writeHead(404).end();
}).listen(Number(process.env.STUB_API_PORT ?? 3101));
