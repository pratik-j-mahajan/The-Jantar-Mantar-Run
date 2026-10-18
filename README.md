# द जंतर मंतर रन — The Jantar Mantar Run

**Play it:** https://the-jantar-mantar-run.vercel.app

A satirical, comic-style arcade run down a Delhi road to Jantar Mantar. It looks 3D but is drawn on a plain 2D canvas. You pick a protester and weave past police bus blockades, riot units, barricades and the orange-shirt stick squad, while a YouTube reporter and his camera person chase the story along the footpath.

Created by **Pratik Mahajan**, Product Designer · [LinkedIn](https://www.linkedin.com/in/pratik-j-mahajan/)

---

## How to play

Reach the Jantar Mantar gate at the end of the road.

| | Desktop | Phone |
|---|---|---|
| Move left / right | hold ← → (or A / D) | drag the joystick (further = faster), or swipe for a quick dash |
| Run forward / step back | hold ↑ / ↓ (or W / S) | drag the joystick up / down (further = faster) |
| Jump | Space | JUMP button, or swipe up |
| Back to character select | Esc, or the ← BACK button | ← BACK button |
| Start / retry | Enter | tap the placard |

**Rules**
- **Barricades:** jump over them. Buses, vans, trucks and water cannons are solid, so go around them.
- **Police and paramilitary:** if one catches you, you're **detained**. Two officers carry you into a van (5 seconds), then you sit through a 5-second countdown and are released a little way back.
- **Health (जान)** starts at 100% and the game ends at 0%:
  - **Stick squad:** a hit costs **−50%**.
  - **Water cannon:** the truck's turret swings toward you (blue aim stripe, "PAANI CHHODO!"), then fires a **3-second** jet. The jet starts on the truck's side of the road and sweeps toward you, aiming where you're running. If its impact zone hits you, you're thrown back and lose **−30%**. Dodge it by keeping to the far side and sprinting past the truck (the nozzle only points forward), by swerving sharply, or by jumping the stream.
  - **Tear gas:** at each blockade, one riot trooper lobs a single tear-gas canister at where you're heading (5 per run at most). A **red ring** shows where it will land. The canister lies on the road pouring out gas. If you're inside the ring when it lands, you lose **−20%**, cough, your vision hazes and you slow down for a moment. The cloud lingers and drifts.
- **Jumping:** you can't be caught while high in a jump.
- **Your pace:** there's no auto-run. You choose when to sprint and when to wait for a gap.

## What's in the game

- **Five characters:** Neha, Abhijit, NSUI, GenZ and the Ex Minister. Each has its own design and props, and speed varies slightly.
- **Delhi street, golden hour:** shopfronts with Hindi/English signboards, AC units and hanging wires, colonnaded government buildings, neem trees, autos ("Horn OK Please"), chai stalls, dharna tents, a protest stage, flags and slogan banners.
- **A chowk:** a roundabout with a fountain and a tall tricolour about halfway along.
- **Police presence:** DTC and Dilli Police buses parked across the road as blockades, lines of officers with shields, blue- and olive-camo riot units (one at each blockade carries a tear-gas launcher), troop trucks, four working water-cannon trucks, and police vans that charge at you.
- **Street detail:** manhole covers, patched potholes, leaflets scattered around the protests, slippers lost in scuffles, wet patches where the water cannons fired, pigeons crossing the sky and dust drifting in the sunlight.
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
js/hazards.js         water cannons + tear gas: aiming, firing, hit tests, smoke, spray, screen effects
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
- **Resolution budget:** big and Retina screens render at a capped pixel count (about 2.4 MP at full quality) and are upscaled smoothly, so a 4K monitor costs about the same as a laptop.
- **60 fps cap:** 120 Hz and 144 Hz displays draw every other refresh instead of doubling the work.
- **Adaptive quality** (levels 3 → 0): the game starts one step below full and steps up after about 4 s if the device holds 60 fps comfortably. If a device can't hold about 50 fps, the game steps down resolution, then ground textures, shadows, clouds, grain and crowd distance. The level is remembered per device.
- **Crash-safe:** the frame loop survives unexpected errors and reports them to GA.

### Live visit counter

The small "● clicks" badge shows **2000 + the real number of times the game link has been opened** since launch (16 Oct 2026), and it updates live for everyone. The 2000 base is a display offset (`CLICK_BASE` in `js/game.js`); the stored counter keeps the true count, which `node counter-admin.mjs show` prints. Set `CLICK_BASE = 0` to show the real number. Plays are still counted in the background but not shown.
- **What each number counts:**
  - **visits**: the game was opened, counted once per browser tab session, so reloads don't inflate it.
  - **plays**: a run was started, counted every time, retries included.
- **Not counted:** visits from `localhost` or with `?debug`. Link-preview bots never run the page, so they never count either.
- **Starting totals:** set on 18 Oct 2026 to **109 clicks**: 53 from Google Analytics for 16–17 Oct (live site only, test sessions excluded), plus about 56 from Vercel for 18 Oct (`sw.js` fetches, since GA had not processed that day yet, minus my own test loads). Plays were set to 218 the same way.
- **Service:** the free [Abacus](https://abacus.jasoncameron.dev) counter API, namespace `the-jantar-mantar-run`. Open pages get every change pushed instantly (server-sent events, with polling as a fallback). If the service is down, the badge hides and the game is unaffected. A counter stays alive as long as it's used.
- **Correcting the totals:** use `counter-admin.mjs`. It needs the private admin keys in `.counter-admin.local.json`, which is never committed.

```bash
node counter-admin.mjs show
node counter-admin.mjs set visits 1234
node counter-admin.mjs add plays 10
```

### Google Analytics

GA4 property `G-4LJWPG03B6`. The ID appears twice in `index.html`, so change both to use a different property.

| Event | When | Params |
|---|---|---|
| `character_selected` | a character card is clicked | `character` |
| `game_start` | every run, retries included | `character`, `attempt` |
| `player_detained` | caught by police / paramilitary / a van | `character`, `detentions`, `progress_pct`, `by` |
| `player_hit` | stick squad, water cannon or tear gas | `character`, `by` (stick/water/gas), `damage`, `health_before`, `progress_pct` |
| `game_over` | health reaches 0% | `character`, `by`, `progress_pct`, `time_sec`, `detentions`, `hits` |
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
| Water cannon range / timing, tear-gas radius | `JET` and `GAS` at the top of `js/hazards.js` |
| Damage amounts | the `damage(…)` calls (stick in `js/game.js`, water/gas in `js/hazards.js`) |
| Run speed, jump height | `RUN`, `JUMP_V` at the top of `js/game.js` |

### Testing

Add `?debug` to the URL to expose `window.__jm`. `__jm.run(seconds)` steps the game deterministically, and `__jm.P`, `__jm.G` and `__jm.W` hold the player, the run stats and the world.

---

## Credits

- Game design, art direction and development: **Pratik Mahajan**
- Fonts: [Yatra One](https://fonts.google.com/specimen/Yatra+One), [Bangers](https://fonts.google.com/specimen/Bangers) and [Baloo 2](https://fonts.google.com/specimen/Baloo+2), all under the SIL Open Font License
