// Tiny stand-in for the Platform API: GET /defects returns the seeded fixture,
// POST /__seed/:n swaps the fixture to n generated defects.
import { createServer } from "node:http";

const AREAS = ["Login", "Billing", "Reports", "Other"];
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
let failMode = "off";

// Portfolio data for the dashboard: 3 holdings, 2 SIPs, value 10000000 paise (paise integers, like the real API).
const holding = (symbol, quantity, currentValue, returns, dayChange) => ({
  symbol,
  quantity,
  investedAmount: currentValue - returns,
  currentValue,
  returns,
  dayChange,
  dayChangePercent: 0,
});
const PORTFOLIO_BODIES = {
  "/portfolio": { invested: 9000000, currentValue: 10000000, returns: 1000000 },
  "/holdings": [
    holding("NIFTYBEES", 312, 4500000, 410000, 80000),
    holding("HDFCBANK", 22, 3500000, 230000, 45000),
    holding("INFY", 13, 2000000, -85000, 0),
  ],
  "/sips": [
    { id: "sip-1", symbol: "NIFTYBEES", amount: 500000, dayOfMonth: 1 },
    { id: "sip-2", symbol: "HDFCBANK", amount: 300000, dayOfMonth: 15 },
  ],
  "/stocks": [
    { symbol: "NIFTYBEES", name: "Nifty 50 index fund", price: 28000 },
    { symbol: "HDFCBANK", name: "HDFC Bank", price: 160000 },
    { symbol: "INFY", name: "Infosys", price: 150000 },
  ],
};
let portfolioScenario = "default";

createServer((req, res) => {
  const seed = /^\/__seed\/(\d+)$/.exec(req.url ?? "");
  if (req.method === "POST" && seed) {
    data = build(Number(seed[1]));
    failMode = "off";
    res.writeHead(204).end();
    return;
  }
  const scenario = /^\/__portfolio\/(default|failing)$/.exec(req.url ?? "");
  if (req.method === "POST" && scenario) {
    portfolioScenario = scenario[1];
    res.writeHead(204).end();
    return;
  }
  if (req.method === "GET" && req.url && req.url in PORTFOLIO_BODIES) {
    if (portfolioScenario === "failing") {
      res.writeHead(500).end();
      return;
    }
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(PORTFOLIO_BODIES[req.url]));
    return;
  }
  const fail =/^\/__fail\/(on|off|malformed)$/.exec(req.url ?? "");
  if (req.method === "POST" && fail) {
    failMode = fail[1];
    res.writeHead(204).end();
    return;
  }
  if (req.method === "GET" && req.url === "/defects" && failMode === "on") {
    res.writeHead(500).end();
    return;
  }
  if (req.method === "GET" && req.url === "/defects" && failMode === "malformed") {
    res.writeHead(200, { "content-type": "application/json" }).end("{}");
    return;
  }
  if (req.method === "GET" && req.url === "/defects") {
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(data));
    return;
  }
  const one = /^\/defects\/([^/?]+)$/.exec(req.url ?? "");
  if (req.method === "GET" && one) {
    const id = decodeURIComponent(one[1]);
    if (id === "DEF-BOOM") {
      res.writeHead(500).end();
      return;
    }
    const base =
      id === "DEF-NOATT"
        ? { id, title: "No extras", status: "open", severity: "low", area: "Login", reportedAt: "2026-10-01" }
        : data.find((d) => d.id === id);
    if (!base) {
      res.writeHead(404).end();
      return;
    }
    const bare = id === "DEF-NOATT";
    res.writeHead(200, { "content-type": "application/json" }).end(
      JSON.stringify({
        ...base,
        description: `Description of ${base.title}`,
        assignee: bare ? null : "Dana Lee",
        attachments: bare ? [] : [{ name: "screenshot.png", url: "http://localhost/files/screenshot.png" }],
        comments: bare ? [] : [{ id: "c1", author: "Sam", body: "Reproduced on 17.1", createdAt: "2026-10-02T10:00:00Z" }],
      }),
    );
    return;
  }
  res.writeHead(404).end();
}).listen(Number(process.env.STUB_API_PORT ?? 3101));
