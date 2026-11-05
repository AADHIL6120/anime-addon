# My Anime Addon (Stremio / Nuvio)

Anime catalogs and metadata from the public Kitsu API. No dependencies, Node 18+.

## Run locally

    node server.js
    # open http://localhost:7000/manifest.json

## Deploy free on Vercel

1. Create a GitHub repo and push this folder to it.
2. Go to vercel.com, sign in with GitHub, click Add New > Project, import the repo.
3. Leave all settings at default and click Deploy.
4. Your manifest URL is https://YOUR-PROJECT.vercel.app/manifest.json

## Deploy free on Render

1. Push this folder to a GitHub repo.
2. Go to render.com, click New > Web Service, connect the repo.
3. Runtime: Node. Build command: (leave empty or `npm install`). Start command: `npm start`. Instance type: Free.
4. Your manifest URL is https://YOUR-SERVICE.onrender.com/manifest.json
   (Free instances sleep after ~15 min idle; the first request after that is slow.)

## Install in the apps

- Stremio: Addons > paste the manifest URL into the search box > Install.
- Nuvio: Settings > Addons/Plugins > Add > paste the manifest URL.
  (Menu names can differ between Nuvio versions.)

## Adding streams

This addon only provides catalogs and metadata. To add a `stream` resource, add "stream" to
`resources` in addon.js and handle `/stream/:type/:id.json`, returning
`{ "streams": [{ "title": "...", "url": "https://..." }] }` from sources you are licensed
to use (your own media server, a service you subscribe to, etc.).
