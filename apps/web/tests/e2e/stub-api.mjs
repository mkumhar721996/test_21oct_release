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

const PEOPLE = [
  { id: "p1", name: "Sam Ortiz", roles: ["tester"] },
  { id: "p2", name: "Mia Fox", roles: ["manager"] },
  { id: "p3", name: "Lee Chen", roles: ["lead"] },
  { id: "p4", name: "Dev Dan", roles: ["developer"] },
];
const SESSIONS = { tester: { name: "Tess Tester", roles: ["tester"] }, developer: { name: "Dev Dan", roles: ["developer"] } };
let session = "tester";
// per-defect mutable state: assignee/status overrides and the optimistic-lock version
let changes = new Map();

function resetState() {
  session = "tester";
  changes = new Map();
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(raw || "{}"));
      } catch {
        resolve({});
      }
    });
  });
}

function detail(id) {
  const bare = id === "DEF-NOATT";
  const base =
    bare || id === "DEF-FAIL"
      ? { id, title: bare ? "No extras" : "Save fails", status: "open", severity: "low", area: "Login", reportedAt: "2026-10-01" }
      : data.find((d) => d.id === id);
  if (!base) return null;
  const change = changes.get(id) ?? { version: 1 };
  return {
    ...base,
    description: `Description of ${base.title}`,
    assignee: bare ? null : "Dana Lee",
    attachments: bare ? [] : [{ name: "screenshot.png", url: "http://localhost/files/screenshot.png" }],
    comments: bare ? [] : [{ id: "c1", author: "Sam", body: "Reproduced on 17.1", createdAt: "2026-10-02T10:00:00Z" }],
    ...change,
  };
}

const json = (res, status, body) => res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(body));

createServer(async (req, res) => {
  const seed = /^\/__seed\/(\d+)$/.exec(req.url ?? "");
  if (req.method === "POST" && seed) {
    data = build(Number(seed[1]));
    failMode = "off";
    resetState();
    res.writeHead(204).end();
    return;
  }
  const sessionSwitch = /^\/__session\/(tester|developer|expired)$/.exec(req.url ?? "");
  if (req.method === "POST" && sessionSwitch) {
    session = sessionSwitch[1];
    res.writeHead(204).end();
    return;
  }
  const bump = /^\/__bump\/([^/]+)$/.exec(req.url ?? "");
  if (req.method === "POST" && bump) {
    const id = decodeURIComponent(bump[1]);
    const current = detail(id);
    if (!current) return res.writeHead(404).end();
    const { assignee, status } = await readBody(req);
    changes.set(id, {
      assignee: assignee === undefined ? current.assignee : assignee,
      status: status ?? current.status,
      version: current.version + 1,
    });
    res.writeHead(204).end();
    return;
  }
  if (req.method === "POST" && req.url === "/__reset") {
    resetState();
    res.writeHead(204).end();
    return;
  }
  if (req.method === "GET" && req.url === "/session") {
    if (session === "expired") return res.writeHead(401).end();
    return json(res, 200, SESSIONS[session]);
  }
  if (req.method === "GET" && (req.url ?? "").startsWith("/people")) {
    const roles = new URL(req.url, "http://stub").searchParams.get("roles")?.split(",") ?? [];
    return json(res, 200, PEOPLE.filter((p) => roles.length === 0 || p.roles.some((r) => roles.includes(r))));
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
    const found = detail(id);
    if (!found) {
      res.writeHead(404).end();
      return;
    }
    return json(res, 200, found);
  }
  if (req.method === "PATCH" && one) {
    const id = decodeURIComponent(one[1]);
    const body = await readBody(req);
    if (session === "expired") return res.writeHead(401).end();
    if (session !== "tester") return res.writeHead(403).end();
    if (id === "DEF-FAIL") return res.writeHead(500).end();
    const current = detail(id);
    if (!current) return res.writeHead(404).end();
    if (body.version !== current.version) return json(res, 409, { defect: current });
    const next = {
      assignee: body.assignee === undefined ? current.assignee : body.assignee,
      status: body.status ?? current.status,
      version: current.version + 1,
    };
    changes.set(id, next);
    return json(res, 200, detail(id));
  }
  res.writeHead(404).end();
}).listen(Number(process.env.STUB_API_PORT ?? 3101));
