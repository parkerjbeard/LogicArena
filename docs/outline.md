**Creating a technical outline**

The user wants an updated, detailed technical outline for their project, focusing specifically on natural deduction proof-based duels. They want the essential functions for the beta version, without extraneous features. I'll provide a comprehensive yet concise outline, avoiding overuse of structured lists. I can use bullet points and headings if necessary, but they’ve requested minimal use of structured lists overall. I’ll make sure to craft a clean and functional outline while still conveying all the details needed.


**Preparing project description**

I need to include the project details, like architecture, services, gameplay, proof-checker, problem generator, front-end, data model, and dev ops. I'll update the proof-checker and natural deduction sections, replacing any SAT-specific ones. I’m not sure if I should search the web for up-to-date information. Natural deduction and Carnap might have static details, but I may still need to cite sources. I’ll search for relevant info to include accurate and minimal citations.


Thought for 16 seconds


**Project summary**
“LogicArena-α” is a minimal, self-hostable web platform that lets students (i) grind auto-generated natural-deduction puzzles and (ii) race each other to be first with a *syntactically valid* proof of Γ ⊢ φ.  Proofs are written in Fitch-style text, verified in milliseconds by Carnap’s proof-checker API ([Carnap][1]), cross-checked for validity through a SAT oracle.  A plain Elo ladder ranks both solo and duel play.  Target load: 500 simultaneous sockets, 50 k proof submissions per day.

---

### Core services (one Git repo, Docker-Compose)

`gateway` FastAPI; JWT auth, REST+WS, rate-limits, static serve.
`front` Vue 3 + Vite; SSR fallback; Tailwind; Monaco-based Fitch editor.
`match` Redis-backed lobby; pairs two ready players, spawns a WS room with 3-minute global clock, best-of-3 rounds.
`puzzle` delivers single-player tasks and records verdict events.
`proof-checker` stateless container image (`alpine:glibc → Carnap binary + minisat`). Accepts `{gamma, phi, proof}`; returns `{ok, lines, depth, counterModel?}`.  On `ok=false`, minisat decides whether Γ ⊢ φ is in fact valid, returning “valid sequent / bad proof” if so.
`rating` immediate Elo update (K = 40, initial = 1000) on every verdict.
Datastores: Postgres for users/games/puzzles; Redis for queues & pub/sub.

---

### Data skeleton

User(id, handle, pwd\_hash, email, created)
Puzzle(id, gamma, phi, difficulty, best\_len)
Game(id, playerA, playerB, round, winner, started, ended)
Submission(id, user\_id, puzzle\_id?, game\_id?, payload, verdict, ms)

---

### Gameplay loops

*Puzzle drill* Infinite untimed queue; wrong answer ends run; each accepted proof updates puzzle Elo.
*Blitz duel* Both players see the same sequent; first accepted proof wins the round; each invalid submission deducts 15 s from that player’s reserve; match = best-of-3.

Leaderboard = descending Elo.  Click a name to replay their shortest proof.

---

### Proof checking

Carnap parses and validates Fitch-style proofs via its JSON endpoint; it already supports multiple ND dialects and returns structured feedback ([Carnap][2]).  The service limits each call to 2 s / 256 MB via cgroups.  Minisat is invoked only when Carnap rejects the proof, to decide whether the sequent itself is valid so the UI can distinguish “wrong rules” from “goal impossible.”

---

### Puzzle generation (nightly cron)

1. Sample 4-10 propositional variables, generate random clauses until DIMACS file is UNSAT under minisat.
2. Extract DRAT proof, auto-convert to an ND proof with the Carnap library; record its line count as `best_len`.
3. Tag difficulty by clause count and depth of derived ND proof.
4. Store Γ and φ (the final goal) along with the machine proof; duplicate puzzles are hashed away.

5 k puzzles are pre-seeded; the generator refreshes 500/night.

---

### Front-end flow

Single-page “Arena” route hosts either *Practice* or *Duel*.  The Fitch editor indents with Tab to open nested boxes; a rule-picker sidebar inserts rule labels.  The WebSocket carries clock ticks and opponent verdicts.  After acceptance the winning proof is syntax-highlighted and shown to both players; losing side sees the minimal counter-model if the sequent is invalid.

---

### DevOps

Dev: Docker-Compose with hot-reload.
Prod: single-node k3s (or Dokku) on a mid-range VPS; GitHub Actions builds and pushes images.  Prometheus + Grafana scrape FastAPI metrics; daily pg\_dump to S3.  Expected burn < \$200 / month.

---

### Roll-out schedule

Week 1 Repo scaffold, Postgres schema, FastAPI skeleton.
Week 2 Proof-checker container + puzzle drill live.
Week 3 Match-making, WS duel rooms, global clock.
Week 4 Elo ladder, basic leaderboard, VPS deploy for classroom beta.

Lichess’s MIT-licensed stack (backend *lila*, frontend Vue) provides proven patterns for lobby, sockets, and ratings ([GitHub][3]); we copy only what we need, replacing the chess engine with Carnap + minisat.

Ship, let the students battle—and learn logic at blitz speed.

[1]: https://carnap.io/about?utm_source=chatgpt.com "About Carnap"
[2]: https://carnap.io/srv/doc/index.md?utm_source=chatgpt.com "Carnap Documentation"
[3]: https://github.com/lichess-org/lila?utm_source=chatgpt.com "lichess.org: the forever free, adless and open source chess server"
