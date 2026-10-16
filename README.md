# द जंतर मंतर रन — The Jantar Mantar Run

**Play it:** https://the-jantar-mantar-run.vercel.app

A satirical, comic-style arcade run down a Delhi road to Jantar Mantar. It looks 3D but is drawn on a plain 2D canvas. You pick a protester and weave past police bus blockades, riot units, barricades and the orange-shirt stick squad, while a YouTube reporter and his camera person chase the story along the footpath.

Created by **Pratik Mahajan**, Product Designer · [LinkedIn](https://www.linkedin.com/in/pratik-j-mahajan/)

---

## How to play

Reach the Jantar Mantar gate at the end of the road.

| | Desktop | Phone |
|---|---|---|
| Move left / right | hold ← → (or A / D) | hold ◀ ▶, or swipe for a quick dash |
| Run forward / step back | hold ↑ / ↓ (or W / S) | hold ▲ / ▼ |
| Jump | Space | JUMP button, or swipe up |
| Back to character select | Esc, or the ← BACK button | ← BACK button |
| Start / retry | Enter | tap the placard |

**Rules**
- **Barricades:** jump over them. Buses, vans, trucks and water cannons are solid, so go around them.
- **Police and paramilitary:** if one catches you, you're **detained**. Two officers carry you into a van (5 seconds), then you sit through a 5-second countdown and are released a little way back.
- **Stick squad:** a hit costs **50% जान** (health). A second hit means **game over**.
- **Jumping:** you can't be caught while high in a jump.
- **Your pace:** there's no auto-run. You choose when to sprint and when to wait for a gap.

## What's in the game

- **Five characters:** Neha, Abhijit, NSUI, GenZ and the Ex Minister. Each has its own design and props, and speed varies slightly.
- **Delhi street, golden hour:** shopfronts with Hindi/English signboards, AC units and hanging wires, colonnaded government buildings, neem trees, autos ("Horn OK Please"), chai stalls, dharna tents, a protest stage, flags and slogan banners.
- **A chowk:** a roundabout with a fountain and a tall tricolour about halfway along.
- **Police presence:** DTC and Dilli Police buses parked across the road as blockades, lines of officers with shields, blue- and olive-camo riot units, troop trucks, water cannons, and police vans that charge at you.
- **Media crew:** "Samdish · Unfiltered" and "Camera Person Parth" run along the footpath with police on their heels. When you're detained, they rush in to film and interview.
- **Finish:** the Jantar Mantar compound, with the Samrat Yantra, the curved quadrants and the Ram Yantra, plus marigold petals and a "जंतर मंतर / GenZ" win banner.
- **Soundtrack:** generated live. A daphli protest beat, call-and-response chants ("In-qui-lab! / Zin-da-baad!", "Hum de-khen-ge!", "Aa-waaz do! / Hum ek hain!"), crowd claps, bansuri and harmonium, plus police whistles, sirens, auto horns and a temple bell. The mute button is in the HUD.

This is a lighthearted satire. Every character is a generic cartoon, and the music is original, not copied from any real recording or song.

---

## Tech

Plain HTML, CSS and JavaScript, with no framework and no image or audio assets. The art is drawn with canvas vector code and cached as sprite frames; the sound is synthesized with WebAudio.

```
index.html            page, screens, HUD, GA4 snippet, social meta tags
style.css             comic-poster UI (banner title, placard buttons, HUD, panels)
js/audio.js           music + sound effects (daphli, chants, bansuri, harmonium, whistle, siren, bell)
js/sprites.js         characters, police, paramilitary, stick squad, crowd, media crew; sprite cache
js/engine.js          2.5D renderer: chase camera, lit boxes, texture-mapped faces, billboards,
                      shadows; adaptive quality levels
js/props.js           textures: Delhi facades, buses, vans, trucks, autos, barricades, banners,
                      tents, trees, asphalt, pavers
js/world.js           level layout (blockades, chowk, set dressing) + world rendering
js/game.js            game states, input, AI, detention sequence, media crew, effects, HUD,
                      analytics, idle sprite pre-rendering
fonts/                self-hosted, subsetted woff2 (Yatra One, Bangers, Baloo 2)
og-image.jpg          1200×630 share preview, rendered from the game itself
apple-touch-icon.png  home-screen icon
sw.js                 service worker (repeat visits load from the device)
build.mjs             production build → dist/
vercel.json           Vercel build + cache headers
netlify.toml          Netlify build config
```

### Run locally

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080. The source files run as-is, with no build needed.

### Production build

```bash
npm install
npm run build
```

`dist/` gets one minified JS file and one CSS file with content-hashed names, the fonts, the images, a versioned service worker, and cache headers for Vercel and Netlify. The first visit downloads about **45 KB gzipped of code** plus about **90 KB of fonts**. Code and fonts are cached for a year, so repeat visits load from the device. If esbuild is missing, the build still succeeds; it just skips minification.

### Deploy

- **Vercel** (current host): import the repo at vercel.com/new and click Deploy. `vercel.json` sets everything up, and every push to `main` redeploys.
- **Netlify:** connect the repo; `netlify.toml` builds automatically.
- **Cloudflare Pages:** set the build command to `npm run build` and the output to `dist`.

### Performance

- **Built for heavy traffic:** everything runs in the player's browser, so there is no game server to overload; the CDN just serves static files.
- **Fast start:** fonts are preloaded from the same origin, and Google Analytics loads only after the game is ready. The game is playable in under a second on a normal connection.
- **No stutter mid-run:** character poses are pre-rendered in idle time.
- **Adaptive quality** (levels 3 → 0): if a device can't hold about 40 fps, the game steps down resolution, then ground textures, shadows, clouds, grain and crowd distance. The level is remembered per device.
- **Crash-safe:** the frame loop survives unexpected errors and reports them to GA.

### Google Analytics

GA4 property `G-4LJWPG03B6`. The ID appears twice in `index.html`, so change both to use a different property.

| Event | When | Params |
|---|---|---|
| `character_selected` | a character card is clicked | `character` |
| `game_start` | every run, retries included | `character`, `attempt` |
| `player_detained` | caught by police / paramilitary / a van | `character`, `detentions`, `progress_pct`, `by` |
| `player_hit` | caught by the stick squad | `character`, `health_before`, `progress_pct` |
| `game_over` | the second hit | `character`, `progress_pct`, `time_sec`, `detentions`, `hits` |
| `game_won` | reached Jantar Mantar | `character`, `time_sec`, `detentions`, `hits`, `health` |
| `game_quit` | ← BACK / Esc during a run | `character`, `progress_pct`, `time_sec` |
| `linkedin_click` | the creator's LinkedIn button | `from` |
| `exception` | an unexpected runtime error | `description`, `fatal` |

To see the params in GA4 reports, register them under **Admin → Custom definitions** (event scope).

### Tweaking

| Want to change… | Where |
|---|---|
| Slogans the crowd chants | `CHANTS` in `js/audio.js` |
| Music tempo / melody / rhythm | `bpm`, `TUNE`, `PAT` in `js/audio.js` |
| Characters (names, looks, speed) | `CHARS` in `js/sprites.js` |
| Blockade positions, trucks, platoons | `BLOCKS`, `TRUCKS`, `platoon(...)` in `js/world.js` |
| Detention length | `CAPTURE` and `DETAIN_MS` at the top of `js/game.js` |
| Run speed, jump height | `RUN`, `JUMP_V` at the top of `js/game.js` |

### Testing

Add `?debug` to the URL to expose `window.__jm`. `__jm.run(seconds)` steps the game deterministically, and `__jm.P`, `__jm.G` and `__jm.W` hold the player, the run stats and the world.

---

## Credits

- Game design, art direction and development: **Pratik Mahajan**
- Fonts: [Yatra One](https://fonts.google.com/specimen/Yatra+One), [Bangers](https://fonts.google.com/specimen/Bangers) and [Baloo 2](https://fonts.google.com/specimen/Baloo+2), all under the SIL Open Font License
