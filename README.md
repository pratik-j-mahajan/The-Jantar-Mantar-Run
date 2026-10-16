# चलो जंतर मंतर — Chalo Jantar Mantar

A comic-style, 3D-looking arcade run down a Delhi road to Jantar Mantar. You pick a protester, switch lanes, jump barricades, and dodge the Dilli Police and the orange-shirt stick squad.

Everything is plain HTML, CSS, and JS. A build step is optional (it just minifies), and there are no image or audio files. The art is drawn with canvas vectors and cached as sprite frames, and the music and sound effects are generated live with WebAudio. The production build is about 42 KB gzipped, plus Google Fonts.

```
index.html      page, screens, GA4 snippet
style.css       comic-poster UI (banner title, placard buttons, HUD)
js/audio.js     dhol/tabla groove, shehnai melody, tanpura drone, whistle, siren, bell
js/sprites.js   the 5 playable characters + police / stick squad / crowd, sprite cache
js/engine.js    2.5D renderer: tilted chase camera, lit boxes, textured faces, billboards
js/props.js     textures: Delhi facades, police vans, autos, barricades, banners, trees
js/world.js     level layout, chowk, Jantar Mantar compound, world rendering
js/game.js      game states, input, AI, effects, HUD, analytics
```

## Run locally

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080. These are the readable source files, with no build step needed.

## Deploy (built for heavy traffic)

The game runs entirely in each player's browser, so there's no game server to overload. A thousand players at once is just a thousand downloads of about 42 KB (gzipped) from a CDN. For the best result, deploy the **production build**:

```bash
npm install
npm run build
```

This creates `dist/`, which contains:
- one minified JS file and one minified CSS file with content-hashed names (`assets/game.<hash>.js`), cached for a year by browsers and the CDN
- `index.html` (never cached, so new versions go live instantly)
- `sw.js`, a service worker. After the first visit, the game loads from the player's own device, so repeat plays barely touch your host.
- `_headers` (Netlify) and `vercel.json` (Vercel), with the cache rules above

Where to host:
- **Netlify:** connect the repo (it picks up `netlify.toml` and builds automatically), or drag the `dist/` folder onto app.netlify.com/drop.
- **Vercel:** go to vercel.com/new, import this GitHub repo and click Deploy. `vercel.json` already sets the build command, the output folder and the cache headers. Every push to `main` redeploys automatically.
- **Cloudflare Pages:** set the build command to `npm run build` and the output to `dist`. Bandwidth is unlimited on the free plan, which is good if it goes viral.
- **GitHub Pages:** publish the contents of `dist/`. Custom cache headers aren't supported, but the service worker still caches for repeat players.

### Smooth on every device

The game picks a detail level (3 = full, 0 = lightest) and lowers it automatically if a device can't hold about 40 fps during a run. In order, it drops resolution, footpath textures, asphalt texture, cast shadows, clouds, film grain and crowd draw distance. The chosen level is remembered for the player's next visit, and phones and low-core devices start one level lower.

## Google Analytics

The game reports to GA4 property `G-4LJWPG03B6`, which is set in `index.html` (it appears twice). To use a different property, change both.

| Event | When | Params |
|---|---|---|
| `character_selected` | a character card is clicked | `character` |
| `game_start` | every run, retries included | `character`, `attempt` |
| `player_detained` | caught by police or a police van | `character`, `detentions`, `progress_pct`, `by` |
| `player_hit` | caught by the stick squad | `character`, `health_before`, `progress_pct` |
| `game_over` | the second hit | `character`, `progress_pct`, `time_sec`, `detentions`, `hits` |
| `game_won` | reached Jantar Mantar | `character`, `time_sec`, `detentions`, `hits`, `health` |

To see the params in GA4 reports, register them under Admin → Custom definitions.

## Controls

- **Desktop:** ← → move sideways (hold), ↑ hold to run, ↓ move back, Space to jump, Enter to start or retry.
- **Mobile:** on-screen ◀ ▶ ▲ ▼ JUMP buttons, plus swipes (left/right dashes sideways, up jumps).

## Testing

Adding `?debug` to the URL exposes `window.__jm`. `__jm.run(seconds)` steps the game deterministically.
