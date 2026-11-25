# Loads video studio

Everything needed to make the @loadspickup Instagram videos, plus the rules for what goes out and how we judge it. The weekly content run and the Monday report both work from this folder.

## Setup (fresh machine)

```
pip install --break-system-packages playwright numpy scipy soundfile
python3 -m playwright install chromium     # only if /usr/bin/google-chrome is missing
# ffmpeg must be on PATH
```

## How a video is made

1. **Scene.** Copy the closest existing scene (`never.html` for lists, `towels.html` for loops, `sock.html` for story episodes, `hours.html` for stat hooks, `spa.html` for explainers). Every scene loads `lib.js` and defines `seek(t)`, which draws the exact moment `t` seconds in. No CSS animations: everything is computed in `seek` so renders are frame-exact.
2. **Check frames first.** `python3 still.py scene.html 1080 1920 /tmp/x 0 1.5 3 ...` and look at the busiest moments. Fix overlaps before rendering.
3. **Sound.** Copy the closest `*_audio.py`. Everything is synthesized in `synth.py` (no samples, no licensed music). Put a hit on every on-screen event. For loops, wrap the tail back to the start (see `towels_audio.py`).
4. **Render.** `python3 render.py scene.html SECONDS /tmp/a.wav out.mp4` (1080x1920, 30 fps). Then tile-check: `ffmpeg -i out.mp4 -vf "fps=1.5,scale=216:384,tile=9x2" -frames:v 1 tiles.png`.
5. **Host.** Copy the mp4 to `../media/<slug>.mp4`, commit, push, wait about 70 seconds for GitHub Pages. Buffer pulls the video from `https://loadspickup.com/media/<slug>.mp4`.
6. **Schedule.** Buffer `create_post`: org `6b0606bbcdc4b528fb79fc38`, channel `6b0607678541f09ecb915dff` (Instagram @loadspickup), `metadata.instagram = {type: "reel", shouldShareToFeed: true, isAiGenerated: false}`, `mode: customScheduled`, `dueAt` at that day's slot time (below), `video.metadata.thumbnailOffset` at the frame with the hook text fully visible.
7. **Log it.** Add a row to `content-log.csv`.

Posting slots (America/Los_Angeles): Mon 8:23pm, Tue 7:07pm, Wed 6:27pm, Thu 10:47am, Fri 7:59am, Sat 10:08pm, Sun 10:19pm. One post per day (Dimitri's rule). Buffer's free plan holds at most 10 scheduled posts.

## Brand rules (non-negotiable)

- **English only**, on screen and in captions.
- **No laundromat photos or footage.** Dimitri doesn't want the stores shown. Everything is animated.
- **No unprovable claims**: no "fastest", "cheapest", "never lose a sock", "guaranteed stain removal". Fine: pickup and next-day delivery, washed and folded at our own laundromats, folded by hand, first order's pickup and delivery are on us.
- **No AI-generated imagery or video.** Instagram is favoring real, original content in 2026 and labels AI media. Our look is hand-built animation.
- **Original audio only.** Business accounts can't use popular songs.
- **Look**: dark green `#183a2e`, cream `#f3ede2`, mint `#b9d6bb`, pink `#c4235f` / blush `#f2a5c0`, ink outlines `#14251f`. Type: Bricolage Grotesque 800 condensed for headlines, Instrument Serif italic in pink for the punchline word.
- **Safe zone**: keep text between y 250 and 1570 and x 84 to 960 (Instagram's caption and buttons cover the rest).
- **Length** 7 to 15 seconds. The hook must be readable in the very first frame. Make it loop when the format allows (last frame = first frame).

## Characters and running stories

- **Big Load** (`bigLoadSVG`, poses with `blPose`): a stuffed laundry bag in black shades with an iced matcha. Spoiled LA kid who has never done a chore. Catchphrase: "I don't do chores. I do Loads." Running pun: "He just has Loads" (he's rich, and he uses Loads). A pink striped sock always pokes out of his top.
- **Lefty** (`sockSVG`, face with `sockFace`): a pink striped sock who came out of the dryer without his other half, Righty.
- **The Lost Sock Diaries**: ep. 1 "Gone" (posts Sat 11/28) ends with Big Load walking past with a pink striped sock on his head ("Wait... is that Righty?"). Plan: ep. 2 Lefty searches LA (Venice Beach, a Hollywood-style hillside sign that does NOT say Hollywood, Downtown), ep. 3 the reunion: Righty was safe in Big Load's bag the whole time, delivered back folded as a pair. Keep each episode 12 to 15 s with a cliffhanger.

## Captions

A one-line hook, one or two lines of context, then a prompt that drives sends or comments ("Tag the friend who...", "Send this to...", "What would you do with...?"), then "Link in bio." Three or four hashtags from: #laundrydelivery #washandfold #losangeles #laundryday #oddlysatisfying plus one topical tag.

## How we judge the videos

Instagram ranks Reels mostly on watch time, sends per reach and likes per reach, so those decide what we make more of.

Per post (from Buffer `list_posts` with `includeMetrics`, refreshed daily, about 24 h lag):
- **Watch %** = average watch time ÷ video length. Above 70% is strong for 8 to 15 s videos.
- **Sends per 1,000 reach** (Buffer calls it shares). The single best signal of "people liked this enough to pass it on".
- **Saves, follows, comments** per 1,000 reach.

Business (from the backend, which emails "Loads weekly stats (data)" to mick.mathis@gmail.com every Monday 7-8am, counts only):
- **Visits by source**: `instagram` is link-in-bio taps and Instagram referrals.
- **Bookings and Loads Weekly sign-ups by source**: the real answer to "are the videos working".

Rules:
- Each week: about 4 videos in formats that are working + about 3 experiments (new format, new hook style, new character bit).
- A format that sits below the account's median on both watch % and sends for two weeks gets dropped. A format in the top quarter gets a follow-up or a series.
- The first three weeks are directional only: a new account's reach is small and noisy. Look for big gaps, not small ones.
- Change one thing at a time when testing (hook, length, palette, character), and note it in `content-log.csv`.

## Formats so far

| slug | format | notes |
|---|---|---|
| spa-day | explainer | how it works as a spa visit, cream, 15.5 s |
| loading | joke loop | "Sunday, fully loaded", green, 8 s, seamless loop |
| never | list + stamp | "Things Big Load has never done", green, 11 s |
| thanksgiving | seasonal list | survival guide, cream, 11 s |
| 62-hours | stat hook | ATUS stat, what 62 hours buys instead, green, 12 s |
| lost-sock-ep1 | story series | telenovela drama, cliffhanger, 14 s |
| towels | satisfying loop | towels fold onto an endless stack, cream, 8 s |
