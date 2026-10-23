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

const USERS = [
  { email: "priya.nair@wfc.example", password: "Wfc-admin-1", id: "u1", name: "Priya Nair", role: "WFC Admin", organization: null },
  { email: "tom.becker@wfc.example", password: "Consult-2", id: "u2", name: "Tom Becker", role: "Fundraising Consultant", organization: null },
  { email: "maya.okafor@hope.example", password: "Org-admin-3", id: "u3", name: "Maya Okafor", role: "Org Admin", organization: { id: "org-1", name: "Hope Trust" } },
  { email: "daniel.reyes@river.example", password: "Org-staff-4", id: "u4", name: "Daniel Reyes", role: "Org Staff", organization: { id: "org-2", name: "River Foundation" } },
];
const sessions = new Map();

function handleAuth(req, res) {
  const token = /^Bearer (.+)$/.exec(req.headers.authorization ?? "")?.[1] ?? "";
  if (req.method === "POST" && req.url === "/__idle") {
    sessions.clear();
    res.writeHead(204).end();
    return true;
  }
  if (req.method === "POST" && req.url === "/auth/sign-in") {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const { email, password } = JSON.parse(raw || "{}");
      const user = USERS.find((u) => u.email === email && u.password === password);
      if (!user) {
        res.writeHead(401, { "content-type": "application/json" }).end(JSON.stringify({ message: "Email or password is incorrect" }));
        return;
      }
      const { password: _p, email: _e, ...safe } = user;
      const t = `tok-${sessions.size + 1}-${Date.now()}`;
      sessions.set(t, safe);
      res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ token: t, user: safe }));
    });
    return true;
  }
  if (req.method === "POST" && req.url === "/auth/sign-out") {
    sessions.delete(token);
    res.writeHead(204).end();
    return true;
  }
  if (req.method === "GET" && req.url === "/auth/session") {
    const user = sessions.get(token);
    if (!user) res.writeHead(401).end();
    else res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(user));
    return true;
  }
  return false;
}

createServer((req, res) => {
  if (handleAuth(req, res)) return;
  const seed = /^\/__seed\/(\d+)$/.exec(req.url ?? "");
  if (req.method === "POST" && seed) {
    data = build(Number(seed[1]));
    failMode = "off";
    res.writeHead(204).end();
    return;
  }
  const fail = /^\/__fail\/(on|off|malformed)$/.exec(req.url ?? "");
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
