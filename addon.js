// Stremio / Nuvio addon: anime catalogs + metadata from the public Kitsu API.
// No dependencies. Needs Node 18+ (built-in fetch).

const KITSU = "https://kitsu.io/api/edge";
const PAGE = 20; // Kitsu's max page size

const MANIFEST = {
  id: "community.myanime.kitsu",
  version: "1.0.0",
  name: "My Anime (Kitsu)",
  description: "Anime catalogs and metadata powered by Kitsu.",
  resources: ["catalog", "meta"],
  types: ["series", "movie"],
  idPrefixes: ["kitsu:"],
  catalogs: [
    {
      type: "series",
      id: "kitsu-popular",
      name: "Popular Anime",
      extra: [{ name: "search" }, { name: "skip" }],
    },
    {
      type: "series",
      id: "kitsu-top-rated",
      name: "Top Rated Anime",
      extra: [{ name: "skip" }],
    },
    {
      type: "movie",
      id: "kitsu-movies",
      name: "Anime Movies",
      extra: [{ name: "search" }, { name: "skip" }],
    },
  ],
  behaviorHints: { configurable: false },
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Content-Type": "application/json; charset=utf-8",
};

function send(res, code, body, extraHeaders = {}) {
  res.writeHead(code, { ...CORS, ...extraHeaders });
  res.end(JSON.stringify(body));
}

async function kitsu(path) {
  const r = await fetch(`${KITSU}${path}`, {
    headers: { Accept: "application/vnd.api+json" },
  });
  if (!r.ok) throw new Error(`Kitsu ${r.status}`);
  return r.json();
}

function title(attrs) {
  return (
    attrs.titles?.en ||
    attrs.titles?.en_jp ||
    attrs.canonicalTitle ||
    "Untitled"
  );
}

function toMeta(item) {
  const a = item.attributes;
  return {
    id: `kitsu:${item.id}`,
    type: a.subtype === "movie" ? "movie" : "series",
    name: title(a),
    poster: a.posterImage?.large || a.posterImage?.original,
    background: a.coverImage?.large || a.coverImage?.original,
    description: a.synopsis,
    releaseInfo: a.startDate ? a.startDate.slice(0, 4) : undefined,
    imdbRating: a.averageRating
      ? (Number(a.averageRating) / 10).toFixed(1)
      : undefined,
    runtime: a.episodeLength ? `${a.episodeLength} min` : undefined,
  };
}

function parseExtra(str) {
  const out = {};
  if (!str) return out;
  for (const part of str.split("&")) {
    const i = part.indexOf("=");
    if (i > 0) {
      out[decodeURIComponent(part.slice(0, i))] = decodeURIComponent(
        part.slice(i + 1)
      );
    }
  }
  return out;
}

async function catalog(type, id, extra) {
  const skip = Number(extra.skip) || 0;
  const q = new URLSearchParams();
  q.set("page[limit]", String(PAGE));
  q.set("page[offset]", String(skip));

  if (id === "kitsu-movies") q.set("filter[subtype]", "movie");
  else q.set("filter[subtype]", "TV");

  if (id === "kitsu-top-rated") q.set("sort", "-averageRating");
  else q.set("sort", "-userCount");

  if (extra.search) {
    q.set("filter[text]", extra.search);
    q.delete("sort");
  }

  const data = await kitsu(`/anime?${q.toString()}`);
  return { metas: data.data.map(toMeta) };
}

async function meta(type, id) {
  const kitsuId = id.replace(/^kitsu:/, "").split(":")[0];
  const data = await kitsu(`/anime/${kitsuId}?include=categories`);
  const item = data.data;
  const a = item.attributes;
  const m = toMeta(item);

  m.genres = (data.included || [])
    .filter((x) => x.type === "categories")
    .map((x) => x.attributes.title);

  if (m.type === "series") {
    const count = a.episodeCount || 0;
    const released = a.startDate
      ? new Date(a.startDate).toISOString()
      : new Date(0).toISOString();
    m.videos = Array.from({ length: count }, (_, i) => ({
      id: `kitsu:${kitsuId}:${i + 1}`,
      title: `Episode ${i + 1}`,
      season: 1,
      episode: i + 1,
      released,
    }));
  }
  return { meta: m };
}

async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") return send(res, 204, {});

    const path = decodeURIComponent((req.url || "/").split("?")[0]);

    if (path === "/" || path === "/manifest.json") {
      return send(res, 200, MANIFEST, { "Cache-Control": "max-age=3600" });
    }

    // /catalog/:type/:id.json  or  /catalog/:type/:id/:extra.json
    let m = path.match(/^\/catalog\/([^/]+)\/([^/]+?)(?:\/([^/]+?))?\.json$/);
    if (m) {
      const [, type, id, extraStr] = m;
      const body = await catalog(type, id, parseExtra(extraStr));
      return send(res, 200, body, { "Cache-Control": "max-age=1800" });
    }

    // /meta/:type/:id.json
    m = path.match(/^\/meta\/([^/]+)\/(.+)\.json$/);
    if (m) {
      const body = await meta(m[1], m[2]);
      return send(res, 200, body, { "Cache-Control": "max-age=3600" });
    }

    return send(res, 404, { error: "Not found" });
  } catch (err) {
    return send(res, 500, { error: String(err.message || err) });
  }
}

module.exports = { handler, MANIFEST };
