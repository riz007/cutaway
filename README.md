# Cutaway

An interactive 3D teaching tool for how a car works. Pick a vehicle, isolate a system, cut the
bodywork away, and watch the mechanism run — powertrain, brakes, cooling, fuel, lubrication, intake
and exhaust, electrical, climate, drivetrain, suspension, structure, ADAS and cabin.

It is a learning tool, not a configurator and not a driving game.

> **Educational reference.** Not affiliated with or endorsed by any vehicle manufacturer. Geometry is
> representative, not a reproduction of any production vehicle.

---

## Quick start

```bash
npm install
```

```bash
npm run dev
```

Requires Node 20 or newer. For the browser tests, install the browser once with
`npx playwright install chromium`. The app runs at `http://localhost:5173`.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Validate, typecheck, bundle, then check payload budgets |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | Browser smoke tests (Playwright) — run `npx playwright install chromium` once first |
| `npm run validate` | Registry, node-binding and lesson-content validation |
| `npm run budgets` | Payload budget gate against `dist/` |
| `npm run typecheck` | TypeScript only |

## Using it

- **Pick a vehicle** from the header, then choose a powertrain trim. Each vehicle arrives as a kit
  and assembles itself, chassis first and glass last; `Skip` jumps straight to the finished car.
- **Press Play** in the transport bar. That switches the ignition on and ghosts the bodywork so the
  moving parts are visible. Open the throttle and select `D` to get the car rolling.
- **Click any part** in the 3D view or the parts tree to open its lesson, specifications and
  cross-system links. Double-click to focus the camera on it.
- **Isolate a system** from the left rail to strip the view down to one circuit.
- **Explode the car** with the timeline under the view. Parts separate in four layers (body, cabin,
  systems, chassis) with a running piece count; press the play button to sweep it automatically.
- **Orbit** by dragging, or use the on-canvas pad. The toolbar above the view switches between
  Realistic, Schematic and X-ray, toggles the cutaway, and starts a slow turntable.

### Keyboard

| Key | Action |
| --- | --- |
| `Space` | Start / stop the simulation |
| `1`–`7` | Camera presets: 3/4, front, side, top, engine bay, underneath, driver's seat |
| `W` `A` `S` `D` / arrows | Orbit the camera (when the 3D view has focus) |
| `+` / `−` | Zoom |
| `Tab` / `Enter` | Move through every part and open it |
| `Esc` | Leave focus mode |

## Architecture

```
src/
  domain/          Types, registries and Zod validation — the contracts everything binds to
    registry/      systems, components, archetypes, vehicles, flows
  scene/           React Three Fiber layer
    procedural/    Parametric geometry: builders, body profile, layout
    flow/          Animated flow tubes and their shader
  sim/             Kinematic simulation, fixed 60 Hz step, transient store
  ui/              Shell, panels, primitives
  content/         MDX lessons and guided tours
  i18n/            English and Thai catalogues
```

**Archetypes plus data.** Accurate, part-separated models of specific production cars do not exist as
licensable assets, and manufacturer CAD is not available for this. So the app builds 8 anatomically
correct platform archetypes and maps every catalogue model onto one, driving the visible differences
from data. Users get an honest class-level anatomy lesson with model-specific figures.

**Two stores, on purpose.** `useAppStore` is React-subscribed and holds selection, mode and user
controls. `useSimStore` is transient: the tick mutates one object at 60 Hz and the 3D layer reads it
inside `useFrame`, so a running simulation costs zero React renders. Gauges read a 10 Hz snapshot.

**The node contract.** Every part is emitted as `SYS_<system>__<component>__<variant>__LOD<n>`. The
component registry is the authority, and `npm run validate` fails the build on any node that does not
resolve back to it.

## Geometry

There are no commissioned 3D assets. Geometry is generated parametrically from two inputs:

1. **Published exterior dimensions** — length, width, height, wheelbase and ground clearance, each
   carrying a source URL and retrieval date in `src/domain/registry/vehicles.ts`. Verified for 10 of
   50 models so far; the rest inherit class-typical archetype figures, labelled as such in the UI.
2. **Platform proportions** — per-archetype side-elevation ratios in
   `src/scene/procedural/bodyProfile.ts`, extruded into a body with real wheel arches and a cut
   greenhouse.

No vehicle shape is derived from photographs, scans or manufacturer CAD. Differences between models
come from published measurements, which are facts, rather than from copied designs.

Because the emitted node names match the glTF contract, a real `.glb` can replace a generated
archetype one system at a time without touching anything downstream.

**Rendering.** The studio lighting is built from in-scene light formers rather than a downloaded HDR,
so the app works offline and under a strict CSP. Tone mapping is AgX. A performance monitor steps
resolution and effects down on slow GPUs, the frame loop renders on demand, and picking uses
`three-mesh-bvh` so hovering stays cheap with every part on screen.

## Simulation

Deliberately kinematic and pedagogical, not physical. No rigid-body solver and no CFD — parts move on
analytic relations parameterised by a few state variables, because the goal is a correct mental
model, not numeric accuracy.

- A working crank train: every rod stays pinned between its crank throw and piston at all angles,
  cylinders follow real firing orders (1-3-4-2 for inline fours, 120° spacing for triples), and each
  cam lobe points at its valve at peak lift
- Power-split planetary speed relation for series-parallel hybrids
- EV torque envelope, pack state of charge and regeneration limits
- Lumped coolant model with a wax thermostat and fan threshold
- Brake hydraulics from pedal force through to rotor heat, with regen blending
- A 12 V load table driven by ignition position
- Gear ratios, torque-converter slip and the differential speed split

## Accessibility

Non-negotiable, and checked rather than assumed:

- Full keyboard operation; every part is a real button in document order
- A **non-3D text view** at `/fallback` with complete content parity, used automatically when WebGL2
  is unavailable
- `aria-live` status for simulation state; gauges deliberately do not announce, because 10 Hz updates
  would make a screen reader unusable
- System colour coding always paired with a glyph and a label, never colour alone
- Minimum 12px UI text, 16px lesson prose, visible focus rings
- Honours `prefers-reduced-motion` and `prefers-contrast`

## Content and correctness

Every component lesson lives in `src/content/components` as MDX, structured as *what it is → what it
does → how it fails → how it is serviced*, and is code-split so opening the brakes never downloads
the ADAS lessons.

**Technical review is gated.** A lesson only counts as reviewed once its frontmatter declares
`review: reviewed` and names a reviewer with a mechanic's or automotive-engineering background.
Everything else renders behind a visible draft badge, and `npm run validate` reports the split on
every build. Plausible-sounding wrong explanations are worse than no explanation in a teaching
product, so full coverage is a starting point for review rather than a finished deliverable.

Region-specific material is tagged rather than woven into the prose. A `<Market region="Thailand">`
block carries facts that genuinely differ by market — E20 gasohol and B7/B20 biodiesel
compatibility, the Euro 5 diesel standard from January 2024, tropical service intervals, flood and
humidity exposure — so another launch market can swap those blocks without rewriting the lesson.

Spec figures carry a `SourceRef`. Where a number is a class-typical figure rather than a manufacturer
one, the Inspector says so. Manufacturer specifications are never invented.

High-voltage, pyrotechnic, hot and pressurised parts carry persistent hazard warnings stating that
the app is a teaching aid and not a service manual.

## Current state

| | |
| --- | --- |
| Systems | 14 |
| Components | 175 (45 hazard-flagged) |
| Archetypes | 8 |
| Catalogue | 50 models across 13 brands, 63 trims |
| Flow paths | 15 definitions, resolved per configuration |
| Lessons | 175 component lessons (100% coverage), 4 guided tours — **0 technically reviewed** |
| Tests | 145 unit tests, 12 Playwright browser tests |
| Shell payload | ~0.57 MB gzip, against a 6 MB desktop / 3.5 MB mobile budget |

### Known gaps

- No commissioned 3D assets; geometry is parametric and representative.
- Every component has a lesson, but **none has passed technical review**. Coverage is not the same
  as correctness, and the draft badge stays until a qualified reviewer signs each one off.
- Published dimensions verified for 10 of 50 models.
- Thai localisation covers the chrome, system names and safety copy; lesson prose is English only.

## Legal

Manufacturer and model names are used nominatively, to identify the vehicle being described. No
logos, badges, grille designs or other trade dress are reproduced, and no geometry is copied from any
production vehicle. Have counsel review before any public launch.

## Licence

Not yet determined.
