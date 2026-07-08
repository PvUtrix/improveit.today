# ImproveIt.Today — 3-Minute Trailer: Full AI Production Guide

**Goal:** A 3:00 cinematic trailer, built entirely with AI tools, then assembled by hand.
**Core truth:** AI generates *clips* (5–8 seconds each), not *films*. You will generate ~30 shots
individually and **stitch them together** on an editing timeline, layering voiceover, music, and
sound on top. This guide gives you a prompt for every single step.

---

## PART 0 — THE MENTAL MODEL (read this first)

A trailer is 5 layers stacked on a timeline:

```
LAYER 5:  Text / titles / logo          ← added last, in the editor
LAYER 4:  Sound effects (SFX)           ← chimes, whoosh, ambience
LAYER 3:  Music score                   ← one continuous track underneath everything
LAYER 2:  Voiceover (VO)                ← the narrator, drives pacing
LAYER 1:  Video clips (the ~30 shots)   ← the pictures, generated one at a time
```

You build **Layer 1** clip by clip, then drop them onto a timeline in order, then lay 2–5 on top.
That's the whole process. The rest of this document is the detailed how.

**The pipeline for each shot (do this ~30 times):**
```
1. Write the shot        →  (already done below — the shot list)
2. Generate a KEYFRAME   →  a still image (Midjourney / Flux) that locks composition + look
3. Animate the keyframe  →  image-to-video (Kling / Runway / Veo) turns the still into a clip
4. Save the clip         →  named 01.mp4, 02.mp4 ... in order
```
Then, once: record VO, generate music, add SFX, edit, color, export.

**Why image-first (keyframe → animate) instead of text-to-video?**
It gives you *control and consistency*. You approve the exact frame before spending a video
generation on it, and you can reuse the same character/style reference across every shot so Maria
looks like Maria in all 12 of her shots. Pure text-to-video reinvents everything each time.

---

## PART 1 — TOOLS YOU'LL NEED

Pick one per row. Recommendations in **bold**.

| Job | Options | Notes |
|---|---|---|
| Still images (keyframes) | **Midjourney v7**, Flux 1.1 Pro, Ideogram (for text) | MJ = most cinematic. Flux = great realism + free-ish via APIs. |
| Image-to-video | **Kling 2.x**, Runway Gen-4, Luma Ray 2, Pika | Kling = best value + motion. Runway Gen-4 = best character consistency. |
| Text-to-video w/ native audio | **Veo 3** | Generates video *with* matching sound/dialogue. Premium but stunning. |
| Voiceover | **ElevenLabs** | The narrator. Best quality by far. |
| Music score | **Suno v4** or Udio | Generates full instrumental tracks from a text prompt. |
| Sound effects | **ElevenLabs SFX**, or Freesound.org (free) | Chimes, whoosh, ambience. |
| Editing / stitching | **DaVinci Resolve (free)** or CapCut (easiest) | Where you assemble all layers. Resolve = pro color too. |
| Upscale / polish (optional) | Topaz Video AI | Bumps clips to crisp 4K if needed. |

**Minimum viable stack:** Midjourney + Kling + ElevenLabs + Suno + CapCut.

---

## PART 2 — SET UP CONSISTENCY *BEFORE* YOU GENERATE ANYTHING

The #1 thing that makes AI trailers look amateur is characters/style that change every shot. Fix
this up front by creating **reference anchors** you reuse everywhere.

### 2a. The Style Anchor (append to EVERY image prompt)
Create one look and never deviate. Copy this block onto the end of every keyframe prompt:

> `cinematic film still, anamorphic lens, shallow depth of field, teal-and-amber color grade,
> volumetric light, 35mm film grain, high dynamic range, photorealistic, shot on ARRI Alexa,
> aspect ratio 21:9`

### 2b. The Character Sheet (do this once, first)
Generate a reference image of your lead so she's identical across all her shots.

**Prompt (Midjourney/Flux):**
> `Character reference sheet, same woman shown 4 times: front view, 3/4 view, side profile, close-up.
> MARIA, 43 years old, Latina, tired warm eyes, dark hair in a loose bun, faint smile lines, simple
> grey coat, working-class, natural no-makeup look, neutral grey studio background, consistent
> lighting, photorealistic, 8k`

Save the best face. In Midjourney reuse it with `--cref [image_url]`; in Runway use it as a
**Reference**; in Veo attach it as a reference image. This keeps Maria's face stable.

### 2c. The Color Grammar (the emotional engine — never break it)
- **AMBER / orange glow** = a problem *seen but unsolved*.
- **GREEN glow** = a problem *solved*.
Every "point of light" in the film obeys this. It lets a planet-scale idea read in one frame.

---

## PART 3 — THE SHOT LIST (the heart of the guide)

30 shots, ~6s each = ~3:00. For each shot you get: **[IMG]** = keyframe prompt, **[VID]** = the
motion prompt you give the image-to-video tool. Append the Style Anchor (2a) to every [IMG].

> Naming: save each finished clip as `01.mp4`, `02.mp4` ... so they sort in order automatically.

### ACT 1 — THE WORLD (0:00–0:42)

**SHOT 01 — Black to Blue Marble (0:00–0:08)**
- **[IMG]** `Planet Earth seen from deep space, whole, no labels, blue oceans and swirling white clouds, the day-night terminator line, pure black starfield, majestic and silent, NASA photography style`
- **[VID]** `Very slow push-in toward Earth, planet rotating almost imperceptibly, subtle cloud drift, cinematic, no cuts`

**SHOT 02 — Amber lights appear (0:08–0:16)**
- **[IMG]** `Earth at night from orbit, continents dark, thousands of tiny amber pinpoint lights scattered across the landmasses like embers, glowing softly`
- **[VID]** `Slow descent toward the planet, amber pinpoints gently flickering and multiplying, atmosphere beginning to fill the frame`

**SHOT 03 — Plunge through clouds (0:16–0:24)**
- **[IMG]** `First-person falling view plunging through layers of clouds at dawn, motion blur, dramatic god rays, earth surface faintly visible far below`
- **[VID]** `Fast downward camera fall through cloud layers, speed lines, exhilarating descent, clouds whipping past`

**SHOT 04 — City reveal from above (0:24–0:32)**
- **[IMG]** `Aerial drone shot descending over a dense mixed-income city at dusk, warm streetlights, a few dark amber trouble-spots glowing among the grid`
- **[VID]** `Continued smooth descent toward the city grid, gently rotating, lights twinkling on as dusk deepens`

**SHOT 05 — Street level arrival (0:32–0:42)**
- **[IMG]** `Ground-level view of an ordinary working-class neighborhood street corner at dusk, one streetlight dark and broken, wet pavement, lived-in and real, cinematic`
- **[VID]** `Camera settles from above down to eye level at the street corner, coming to rest, gentle handheld feel`

### ACT 2 — THE ONE (0:42–1:48)

**SHOT 06 — Maria arrives (0:42–0:50)** *(use character ref 2b)*
- **[IMG]** `MARIA, 43, tired warm eyes, holding her young child's hand, standing at a dark street corner at dusk, looking up at a broken streetlight, worried, cinematic close-medium shot`
- **[VID]** `Maria stops walking and looks up at the dark streetlight, her child looks up too, subtle wind in her hair, held emotional moment`

**SHOT 07 — She's seen it before (0:50–0:56)**
- **[IMG]** `Close-up of Maria's face lit only by distant car headlights, weary resignation turning to quiet resolve, shallow focus`
- **[VID]** `Slow push-in on Maria's face as her expression shifts from tired to determined`

**SHOT 08 — The report (0:56–1:04)**
- **[IMG]** `Maria's hands raising a smartphone to photograph the broken streetlight, phone screen glowing, dusk, over-the-shoulder shot`
- **[VID]** `Maria lifts the phone, taps the screen to take a photo, a soft glow pulses from the screen`

**SHOT 09 — The first light is born (1:04–1:12)**
- **[IMG]** `A single amber point of light igniting in the air above the street corner, softly glowing, symbolic, magical realism, Maria small below`
- **[VID]** `An amber light blinks into existence above the corner and pulses gently, warm particles drifting`

**SHOT 10 — Nairobi upvote (1:12–1:18)**
- **[IMG]** `A teenage boy in Nairobi at a bus stop looking at his phone, a flooded road behind him, focused expression, golden hour`
- **[VID]** `The boy taps his phone screen with his thumb, nods slightly, the amber light on his screen brightens`

**SHOT 11 — Lisbon solver (1:18–1:24)**
- **[IMG]** `A retired electrician in Lisbon, 60s, weathered kind face, reading a job notification on his phone in a sunny doorway, tools on the wall behind`
- **[VID]** `The man reads the notification, a slow satisfied nod, warm light across his face`

**SHOT 12 — Neighbors crowdfund (1:24–1:32)**
- **[IMG]** `A small group of neighbors on an apartment stoop at night gathered around a phone, faces lit by the screen, community warmth, a funding total visible`
- **[VID]** `Neighbors lean in around the phone, smiles growing, a funding number ticking upward reflected in their eyes`

**SHOT 13 — The number climbs (1:32–1:38)**
- **[IMG]** `Macro shot of a phone screen, a crowdfunding progress bar filling with green, numbers rising, soft bokeh background`
- **[VID]** `The progress bar fills smoothly with green, numbers counting up rapidly, celebratory glow`

**SHOT 14 — City dashboard alert (1:38–1:44)**
- **[IMG]** `A municipal worker at a desk, a large dashboard screen lighting up with a green threshold-reached alert on a city map, professional office, early morning`
- **[VID]** `The dashboard pulses with a green alert, the worker sits up and leans toward the screen`

**SHOT 15 — The crew works (1:44–1:48)**
- **[IMG]** `A repair crew on a lift fixing the streetlight at Maria's corner in daylight, tools and cables, blue-collar heroism, cinematic`
- **[VID]** `A worker connects the final wire, sparks briefly, reaching toward the light fixture`

### ACT 3 — THE WORLD, CHANGED (1:48–3:00)

**SHOT 16 — The light blazes on (1:48–1:56)**
- **[IMG]** `The repaired streetlight bursting to life, brilliant warm-white light flooding the previously dark corner, dusk, hopeful, lens flare`
- **[VID]** `The streetlight flickers then blazes to full brightness, light spilling across the pavement, glorious reveal`

**SHOT 17 — Maria and child walk safe (1:56–2:04)** *(character ref)*
- **[IMG]** `Maria and her child walking hand in hand beneath the now-bright streetlight at night, safe and warm, she glances at her phone smiling, wide shot`
- **[VID]** `Maria and child walk toward camera under the bright light, she looks down at her phone and smiles softly`

**SHOT 18 — The green checkmark (2:04–2:10)**
- **[IMG]** `Close-up of a phone screen showing a large green checkmark and the word RESOLVED, Maria's thumb, warm reflection in her eyes`
- **[VID]** `A green checkmark animates onto the screen with a soft pulse, reflected light warms Maria's face`

**SHOT 19 — Amber turns green (2:10–2:18)**
- **[IMG]** `The single amber light above the corner turning vivid green, then two more nearby lights turning green, spreading, magical realism, night`
- **[VID]** `The amber light shifts to green and pulses, and one by one nearby lights turn green in a spreading chain`

**SHOT 20 — Chain reaction across a city (2:18–2:26)**
- **[IMG]** `Aerial night view of a full city, hundreds of amber dots turning green in waves across the districts, like sunrise spreading`
- **[VID]** `Waves of green spreading across the dark city from point to point, unstoppable momentum, rising`

**SHOT 21 — Global montage: three continents (2:26–2:32)**
- **[IMG]** `Split-second triptych feel: a clean park in Manila, a repaired bridge in Bogotá, a lit playground in Warsaw, all glowing green, golden hour`
- **[VID]** `Quick energetic camera moves across three thriving public spaces, people enjoying them, green light motif`

**SHOT 22 — Faces of joy (2:32–2:38)**
- **[IMG]** `Montage of diverse people around the world smiling, laughing, kids playing in a fixed public space, authentic candid joy, warm light`
- **[VID]** `Candid handheld shots of people laughing and children running, alive and joyful, sun flares`

**SHOT 23 — The ascent begins (2:38–2:44)**
- **[IMG]** `Camera lifting up off a thriving green-lit neighborhood, rising into the evening sky, city shrinking below, reverse of the descent`
- **[VID]** `Smooth camera rise up and away from the glowing neighborhood, ascending fast into the sky`

**SHOT 24 — Back to orbit, healing (2:44–2:52)**
- **[IMG]** `Earth from orbit again at night, but now the amber pinpoints are turning green across every continent, spreading like a green sunrise, breathtaking`
- **[VID]** `Slow pull back from Earth as waves of green light spread across the dark continents, the planet healing`

**SHOT 25 — The green Earth (2:52–2:58)**
- **[IMG]** `Full Earth from deep space, glowing softly with countless green points of light across all landmasses, whole and alive, majestic, black starfield`
- **[VID]** `Earth rotating gently, blanketed in soft green light, serene and triumphant, slow`

**SHOT 26 — Logo resolve (2:58–3:00)**
- **[IMG]** `The green points of light coalescing into a clean minimalist logo mark on pure black background, elegant`
- **[VID]** `Green lights gather and resolve into the logo, settling into place, final`

> Shots 21–22 can be split into extra micro-clips (2–3s each) if you want a punchier montage —
> generate 2–3 alternates and cut fast. That's how you hit exactly 3:00 and control rhythm.

---

## PART 4 — VOICEOVER (Layer 2)

**Tool:** ElevenLabs. Pick a warm, grounded voice (e.g. "Adam" or a custom clone). Settings:
**Stability 45–55, Similarity 75, Style exaggeration low.** Read slowly.

Generate each line as its own audio file so you can place them precisely against the picture.

| # | Timecode | Line |
|---|---|---|
| VO-1 | 0:08 | "From up here… everything looks fine." |
| VO-2 | 0:20 | "Seven billion people. And every one of them walks past something, every single day, that could be better." |
| VO-3 | 0:50 | "For most of history, being ignored was just… how it worked." |
| VO-4 | 1:04 | "But what if one voice… didn't have to stay one voice?" |
| VO-5 | 1:26 | "What if the whole neighborhood could stand behind it — see it, back it, fund it?" |
| VO-6 | 1:48 | "And what if the broken thing everyone sees… finally got fixed?" |
| VO-7 | 2:18 | "Because one problem solved… never stays one problem." |
| VO-8 | 2:44 | "Change the world? No." |
| VO-9 | 2:52 | "Change your corner of it. Seven billion corners… is the world." |

**Text-to-speech prompt note for ElevenLabs:** paste one line at a time; add `...` for the pauses
(the model honors them). Re-roll any line that sounds rushed.

---

## PART 5 — MUSIC (Layer 3)

**Tool:** Suno v4 (or Udio). Generate ONE ~3-minute instrumental that builds. You want a track that
starts sparse and resolves triumphant, mirroring amber→green.

**Suno prompt (Style field):**
> `Cinematic orchestral trailer score, emotional and hopeful, begins with a single sparse piano note
> and a low resonant hum, slowly adds a soft heartbeat pulse and warm strings, builds steadily to a
> full uplifting orchestral swell with choir at the climax, then resolves gently. No drums until
> midpoint. Inspiring, humane, no vocals, instrumental only.`
- Set to **Instrumental**. Generate 3–4 takes, pick the one whose build lands around the 2:18 climax.
- **Pro move:** also generate one 15s "sting" (final swell + resolve) to guarantee a clean ending
  under the logo.

**The two-hum bookend:** the low hum at 0:00 and 2:44 should feel like the same sound — one
unresolved, one resolved (major key). If Suno won't give you that, grab a single sustained synth
pad and pitch/EQ it in the editor.

---

## PART 6 — SOUND EFFECTS (Layer 4)

**Tool:** ElevenLabs Sound Effects (type a description, get a clip) or Freesound.org (free).
Generate/collect and place these:

| SFX | Where | ElevenLabs prompt |
|---|---|---|
| Deep space hum | 0:00 | "deep resonant sci-fi space ambience drone, low and vast" |
| Atmospheric whoosh | 0:16 | "fast air whoosh, falling through atmosphere, cinematic" |
| City ambience | 0:32 | "quiet dusk neighborhood ambience, distant traffic" |
| Photo chime | 0:58 | "soft pleasant notification chime, single tone" |
| Light-ignite shimmer | 1:04 / 2:10 | "magical soft shimmer, a light appearing, warm sparkle" |
| Funding tick-up | 1:32 | "rapid soft digital counter ticking up, positive" |
| Streetlight power-on | 1:50 | "electrical hum then a light powering on, satisfying" |
| Rising swell whoosh | 2:38 | "upward cinematic riser whoosh, building tension release" |
| Final button/impact | 2:58 | "clean cinematic impact hit, resolved, trailer logo sting" |

Keep SFX subtle — they punctuate, they don't dominate. Music + VO carry the film.

---

## PART 7 — EDITING: STITCHING IT ALL TOGETHER (Layer 5 + assembly)

**Tool:** DaVinci Resolve (free, recommended) or CapCut (simplest). Steps:

1. **New project**, set timeline to **3840×1646 (21:9) at 24fps** (cinematic) — or 1920×1080 if you
   need standard. Match whatever ratio you generated clips in.
2. **Import** all clips (`01.mp4`…`26.mp4`), all VO files, the music track, all SFX.
3. **Lay Layer 1:** drag clips onto the video track in numeric order. They'll roughly total ~3:00.
4. **Trim to the beat:** cut each clip to its intended duration (see shot list timecodes). Trailers
   live and die on pacing — Act 1 slower, Act 3 accelerating.
5. **Lay Layer 3 (music) first** underneath everything — it's your rhythmic spine. Align the music's
   climax (~2:18) with SHOT 20 (the chain reaction) and the resolve with the logo.
6. **Lay Layer 2 (VO):** place each VO line at its timecode. Nudge clip cuts so images change on or
   just after key words. **Duck the music** ~6dB under every VO line (Resolve: keyframe the volume).
7. **Lay Layer 4 (SFX):** drop each effect on its moment.
8. **Transitions:** mostly hard cuts. Use a slow cross-dissolve only for the two orbital bookends
   (SHOT 01→02 and SHOT 24→25) and a quick dip-to-black before the logo. Avoid fancy wipes.
9. **Layer 5 — Text/titles.** Add end cards over SHOT 25–26:
   - `Report. Vote. Fund. Solve.` (appears word by word)
   - `ImproveIt.Today`
   - `Your world. Starting now.`
   Use a clean sans-serif, white on the darkening frame.
10. **Color grade (Resolve Color tab):** push the teal-and-amber look uniformly so all 26 clips feel
    like one film. This step is what erases the "made by 5 different AIs" feeling. Add subtle film
    grain over the whole timeline.
11. **Audio master:** normalize to about **-14 LUFS** (web standard). Make sure VO is always clearly
    on top.
12. **Export:** H.264 / H.265, MP4, highest quality. For social also export a 1:1 or 9:16 crop of the
    best 30–45s as a teaser.

---

## PART 8 — WORKFLOW ORDER, TIME & BUDGET

**Do it in this order** (don't animate before your keyframes are locked):
1. Style anchor + character sheet (Part 2) — ~1 hr
2. All 26 keyframe stills (Part 3 [IMG]) — approve each before moving on — ~3–4 hrs
3. Animate all 26 clips (Part 3 [VID]) — ~3–5 hrs incl. re-rolls
4. Voiceover (Part 4) — ~1 hr
5. Music (Part 5) — ~1 hr
6. SFX (Part 6) — ~1 hr
7. Edit / color / export (Part 7) — ~4–6 hrs

**Realistic total:** 2–3 focused days for a first version. Budget ballpark **$60–$150** in AI credits
(Kling/Runway video gen is the main cost; ~40–60 generations counting re-rolls).

**Expect re-rolls.** Roughly 1 in 3 video generations will have a glitch (warping hands, morphing
faces). Generate 2 takes of important shots (06, 16, 17, 24) up front.

---

## PART 9 — SHORTCUTS & PRO TIPS

- **Fastest path:** if you have Veo 3 access, it generates video *with* native sound — great for the
  human dialogue-free shots and ambience, fewer layers to sync. Still stitch in the editor.
- **Consistency is everything:** always reuse the character sheet and style anchor. It's the single
  biggest quality lever.
- **Cut to music, not to script:** once music is down, let the beats dictate cut points. Trailers
  feel professional when picture changes land on musical hits.
- **Less is more on motion:** subtle camera moves read as "expensive." Wild AI motion reads as
  "AI." Prompt for slow, deliberate movement.
- **The bookend is the whole trick:** SHOT 01 (whole blue Earth) and SHOT 25 (whole green Earth) are
  the same shot, transformed. That single rhyme carries the entire message.

---

*Companion file: [trailer-script.md](trailer-script.md) — the narrative/emotional version of this trailer.*
