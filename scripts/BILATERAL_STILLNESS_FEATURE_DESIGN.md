# Bilateral Stillness Enforcement — Feature Design

## Problem

Currently, toggling off one side of a bilateral exercise simply ignores that side's expression
weight when counting reps. This means the user can freely move the "off" side with no consequence.

For physical therapy, the intent of the toggle is the opposite: the user should be training to
move only one side independently. The "off" side should remain **still**, and if it moves too
much during a rep, that rep should not count.

---

## Goals

- If the inactive side moves above a tolerance threshold **at the moment of rep detection**, the
  rep is rejected and a visual warning is shown.
- The tolerance is user-adjustable via a dedicated slider (similar to the difficulty slider),
  because patients have varying degrees of involuntary movement (e.g. synkinesis).
- No changes to unilateral exercises — this only affects `ExpressionController_Bilateral.js`.

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| When to check inactive side | At the moment of rep detection (peak) | Simpler to implement; rewards success at peak expression |
| What happens on violation | Rep rejected + visual warning | Clear feedback without being so strict it frustrates the user |
| Tolerance control | Dedicated slider → `global.StillnessTolerance` | Independent from difficulty; mirrors the existing sensitivity slider pattern |

> **Future consideration:** Change the check from "at peak" to "continuously throughout the rep"
> (from when `midRep` goes true until it resets to false). This is more clinically accurate for
> training synkinesis — the patient should not co-activate the inactive side at any point during
> the movement, not just at the peak. Tracked for future iteration.

---

## Core Formula

At the moment a rep would be counted (active side crosses `currentDifficulty`):

```
inactiveSideThreshold = inactiveSideBaseValue + global.StillnessTolerance
```

If:
```
inactiveSideWeight > inactiveSideThreshold
```
→ Rep is **rejected**. Publish visual warning event.

Otherwise → Rep counts normally.

Where:
- `inactiveSideBaseValue` — the resting value captured at initialization for the inactive side
  (from `global.SequenceExpression[]` via `InitalizationManager`)
- `global.StillnessTolerance` — user-set slider value (range: **0.0 to 0.5**, default ~0.1)
  - Lower = stricter, inactive side must barely move
  - Higher = more lenient, inactive side can move more before invalidating

### Example

| Inactive Base | StillnessTolerance | Allowed up to | Inactive side weight | Result |
|---|---|---|---|---|
| 0.05 | 0.10 | 0.15 | 0.08 | ✅ Rep counts |
| 0.05 | 0.10 | 0.15 | 0.20 | ❌ Rep rejected |
| 0.05 | 0.30 | 0.35 | 0.20 | ✅ Rep counts (lenient setting) |

---

## Which Side is "Inactive"

| State | Active Side | Inactive Side | Base Value to Use |
|-------|------------|---------------|-------------------|
| `isRightDetectionOn = false` | Left | Right | `rightBaseExpressionValue` |
| `isLeftDetectionOn = false` | Right | Left | `leftBaseExpressionValue` |
| Both on | Both | None | No check needed |

Note: Expression labels are camera-mirrored (see `ExpressionController_Bilateral.js` header).
The base values are stored by expression name, so they follow the same mirroring and remain
consistent.

---

## Changes Required

### 1. `PubSubModule.js` — Add new events

```js
SetInactiveSideViolation: 'SetInactiveSideViolation',  // bool — true = violation active
```

### 2. New file: `StillnessManager.js` (mirrors SensitivityManager pattern)

```
// @input Component.ScriptComponent sliderScript
```

- Reads slider value on change, clamps to 0.0–0.5
- Sets `global.StillnessTolerance`
- Default: 0.1

```js
global.StillnessTolerance = 0.1;

script.api.StillnessSlider = function() {
    var val = script.sliderScript.api.getSliderValue();
    if (val > 0.5) val = 0.5;
    global.StillnessTolerance = val;
};
```

### 3. `ExpressionController_Bilateral.js` — Add stillness check at rep detection

In `CountReps()`, at the moment `rawWeight > currentDifficulty && midRep !== true`:

**Before (current):**
```js
if (rawWeight > currentDifficulty && midRep !== true) {
    midRep = true;
    script.completedReps += 1;
    ...
}
```

**After:**
```js
if (rawWeight > currentDifficulty && midRep !== true) {
    if (IsInactiveSideViolating()) {
        pubSub.publish(pubSub.EVENTS.SetInactiveSideViolation, true);
        // rep not counted — user must return to baseline and retry
    } else {
        pubSub.publish(pubSub.EVENTS.SetInactiveSideViolation, false);
        midRep = true;
        script.completedReps += 1;
        ...
    }
}

// When expression returns to baseline, clear warning
if (rawWeight <= currentDifficulty && midRep === true) {
    midRep = false;
    pubSub.publish(pubSub.EVENTS.SetInactiveSideViolation, false);
}
```

New helper function:
```js
/**
 * Returns true if the inactive side is moving more than allowed by StillnessTolerance.
 * Only relevant when one side is toggled off.
 */
function IsInactiveSideViolating() {
    // if both sides are on, there is no inactive side to check
    if (isLeftDetectionOn && isRightDetectionOn) return false;

    var inactiveWeight;
    var inactiveBaseValue;

    if (!isRightDetectionOn) {
        inactiveWeight = GetRawRightWeight();
        inactiveBaseValue = rightBaseExpressionValue;
    } else {
        inactiveWeight = GetRawLeftWeight();
        inactiveBaseValue = leftBaseExpressionValue;
    }

    var threshold = inactiveBaseValue + global.StillnessTolerance;
    return inactiveWeight > threshold;
}
```

### 4. New UI element — Violation warning

Subscribe to `SetInactiveSideViolation` in a UI script. On `true`, show a warning (e.g. text
that reads "Keep [side] side still!" or a color change on the bilateral toggle button).
On `false`, hide the warning.

This can be a new script on the bilateralUI panel or added to `SettingsUiManager.js`.

### 5. Settings UI — New stillness slider

Add the stillness tolerance slider to the `bilateralUI` panel (only visible/relevant when one
side is toggled off). Wire it to `StillnessManager.js`.

---

## Data Flow

```
[User moves active side]
        ↓
ExpressionController_Bilateral.OnUpdate()
        ↓
CountReps() → rawWeight > currentDifficulty?
        ↓ yes
IsInactiveSideViolating()?
   ↓ yes                       ↓ no
Publish SetInactiveSideViolation(true)    midRep = true, rep counted
Show warning UI                           Publish SetInactiveSideViolation(false)

[Expression returns to baseline]
        ↓
midRep = false
Publish SetInactiveSideViolation(false)
Hide warning UI
```

---

## Files Touched Summary

| File | Change |
|------|--------|
| `PubSubModule.js` | Add `SetInactiveSideViolation` event |
| `ExerciseScripts/ExpressionController_Bilateral.js` | Add `IsInactiveSideViolating()`, call in `CountReps()` |
| `StillnessManager.js` | New file — stillness tolerance slider → `global.StillnessTolerance` |
| `My UI Scripts/SettingsUiManager.js` | Subscribe to `SetInactiveSideViolation`, show/hide warning |
| Lens Studio scene | Add stillness slider UI component to bilateralUI panel; wire to StillnessManager |

---

## Open Questions / Future Work

- [ ] **Continuous check:** Upgrade from peak-only check to continuous check throughout the rep
  window (`midRep == true` period). More clinically accurate for synkinesis training.
- [ ] **Per-exercise stillness tolerance:** Currently one global value. Could be per-exercise if
  different expressions require different tolerances.
- [ ] **Standardize `global.Sensitivity` vs `global.Difficulty`:** Unrelated but noted — resolve
  naming inconsistency before adding more globals (see `PROJECT_DOCS.md`).
