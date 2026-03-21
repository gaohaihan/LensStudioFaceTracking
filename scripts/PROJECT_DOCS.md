# Facial Expression Physical Therapy – Lens Studio App

## Overview

This is a Snap Lens Studio augmented reality application designed for **facial expression physical therapy**. Using the device's front-facing camera, it detects how much the user is performing a specific facial expression and guides them through sets and reps of that exercise—similar to a workout app but for facial rehabilitation.

Users are presented with a sequence of facial expression exercises. For each exercise they must complete a configurable number of **sets** and **reps** by expressing their face to a required intensity.

---

## Key Concepts

### Expression Weights

Snap's face mesh API exposes expression values as floats between **0.0** (not expressed) and **1.0** (fully expressed). For example:
- `JawOpen` = 0.0 when mouth is closed, ~1.0 when fully open
- `squintLeft` / `squintRight` = bilateral pair, each 0.0–1.0

Access via:
```js
script.faceMesh.mesh.control.getExpressionWeightByName(expressionName);
```

---

### Unilateral vs. Bilateral Exercises

| Type | Description | Example |
|------|-------------|---------|
| **Unilateral** | Single expression, one measurement | `JawOpen`, `BrowsUpCenter` |
| **Bilateral** | Expression split into left/right sides | `squintLeft` + `squintRight` |

- **Unilateral**: `ExpressionController_Unilateral.js` — detects one expression.
- **Bilateral**: `ExpressionController_Bilateral.js` — detects a left+right expression pair and averages them. The user can toggle off one side to only detect the other (for unilateral facial paralysis patients).

> **Camera Mirroring Note:** Expression weights are flipped relative to the visual (mirrored) display. The code comments note: *"i.e. left = on, return right weight."* This is expected behavior due to the selfie camera mirror effect.

---

### Base Expression Value (Calibration)

Every user has a different **resting expression value**—the value reported by the face mesh when they are NOT consciously making an expression. For example, a user with naturally squinted eyes may have a resting `squintRight` value of 0.1 rather than 0.0.

At exercise start, `InitalizationManager.js` captures these resting values for every expression in the sequence and stores them in:

```js
global.SequenceExpression = [
  { name: "expressionName", isBiLateral: bool, baseValue: float },
  ...
]
```

This baseline is used to ensure reps are only counted when the user goes **above** their personal resting value by a meaningful amount.

---

### Rep Threshold / Difficulty Equation

The minimum expression value required to count as a rep is called `currentDifficulty` (the threshold).

#### Unilateral Threshold:

```
threshold = (baseExpressionValue + 0.01) / (1 - difficulty)
```

#### Bilateral Threshold (both sides active):

```
threshold = ((leftBaseValue + rightBaseValue) / 2 + 0.05) / (1 - difficulty)
```

#### Bilateral Threshold (one side off):

```
threshold = (singleSideBaseValue + 0.01) / (1 - difficulty)
```

Where:
- `baseExpressionValue` = resting value captured at initialization (from `global.SequenceExpression`)
- `difficulty` = user-set sensitivity value from `global.Difficulty` (range: **0.0 to 0.9**)
- Adding `0.01` ensures the threshold is always above the resting value even if base is 0
- As `difficulty` increases toward 0.9, the denominator shrinks, raising the threshold (harder)

#### Example:

| Base Value | Difficulty | Threshold |
|------------|------------|-----------|
| 0.05 | 0.0 (easy) | 0.06 |
| 0.05 | 0.5 (medium) | 0.12 |
| 0.05 | 0.8 (hard) | 0.30 |

> **Known Issue / Discrepancy:** `SensitivityManager.js` sets `global.Sensitivity`, but `ExpressionController_Unilateral.js` and `ExpressionController_Bilateral.js` read `global.Difficulty`. These two global variable names appear to be inconsistent. Verify that these are correctly wired together (e.g., via an intermediate script or Lens Studio component property binding) and consider standardizing to one name.

---

### Rep Counting Logic

A rep is counted using a **hysteresis pattern** to prevent double-counting:

1. `midRep = false` at start
2. When `rawWeight > threshold` AND `midRep == false` → count a rep, set `midRep = true`
3. When `rawWeight <= threshold` AND `midRep == true` → reset `midRep = false`
4. The expression must return below threshold before another rep is counted

When `completedReps >= requiredReps`, a set is completed and reps reset to 0.
When `completedSets >= requiredSets`, the exercise is marked finished.

---

### Sensitivity / Difficulty Setting

`SensitivityManager.js` provides a slider UI for the user to adjust exercise difficulty. The slider value is clamped to **0.0–0.9** (1.0 is excluded as it would make the threshold infinite).

```js
global.Sensitivity = sliderValue;  // Updated when user moves slider
```

> See Known Issue above about `global.Sensitivity` vs `global.Difficulty`.

---

## Architecture

### PubSub (Event Bus)

All communication between scripts is decoupled via a publish-subscribe pattern (`PubSubModule.js`). Scripts never call each other directly—they publish and subscribe to named events.

```js
const pubSub = require("./PubSubModule");

// Subscribe
pubSub.subscribe(pubSub.EVENTS.SomeEvent, (data) => { ... });

// Publish
pubSub.publish(pubSub.EVENTS.SomeEvent, someData);
```

#### Full Event Reference

| Event | Published By | Subscribed By | Purpose |
|-------|-------------|---------------|---------|
| `ExpressionIndexEnabled` | GameManager | ExpressionControllers | Navigate to exercise at given index |
| `InitializeBaseExpressions` | GameManager | InitalizationManager | Capture resting expression values |
| `SetExpressionPromptText` | ExpressionControllers, GameManager | UI script | Update instruction text |
| `SetExpressionSetText` | ExpressionControllers | UI script | Update current set count display |
| `SetExpressionRepText` | ExpressionControllers | UI script | Update current rep count display |
| `SetExpressionRequiredSetText` | ExpressionControllers | UI script | Update required sets display |
| `SetExpressionRequiredRepText` | ExpressionControllers | UI script | Update required reps display |
| `Pause` | GameManager | PauseManager | Pause exercise detection |
| `UnPause` | GameManager | PauseManager | Resume exercise detection |
| `ReInitializeBaseExpression` | GameManager | (TBD) | Re-run calibration mid-session |
| `SetBilateralDetection` | ExpressionController_Bilateral, ExpressionController_Unilateral | SettingsUiManager | Enable/disable bilateral toggle buttons in UI |
| `SetBilateralDetection_Left` | ExpressionController_Bilateral | SettingsUiManager | Set left toggle button state |
| `SetBilateralDetection_Right` | ExpressionController_Bilateral | SettingsUiManager | Set right toggle button state |
| `ToggleBilateralDetection_Left` | SettingsUiManager | ExpressionController_Bilateral | User toggled left-side detection on/off |
| `ToggleBilateralDetection_Right` | SettingsUiManager | ExpressionController_Bilateral | User toggled right-side detection on/off |
| `SetJumpAmount` | ExpressionControllers | SphereController (GameScripts) | Send expression weight to game component |
| `SetPlatformRotation` | (GameScripts) | (GameScripts) | Game mechanic |
| `SetJumpCountText` | (GameScripts) | (GameScripts) | Game mechanic |
| `SetLeftDebugText` | ExpressionControllers | Debug UI | Show left expression weight |
| `SetRightDebugText` | ExpressionControllers | Debug UI | Show right expression weight |
| `SetCombinedText` | ExpressionControllers | Debug UI | Show combined expression weight |
| `SetMinExpressionWeightText` | ExpressionControllers | Debug UI | Show current threshold value |

---

## File Reference

| File | Purpose |
|------|---------|
| `PubSubModule.js` | Event bus — all inter-script communication |
| `GameManager.js` | Top-level game flow: start, next/prev exercise, pause |
| `InitalizationManager.js` | Captures resting expression baselines at session start |
| `PauseManager.js` | Manages global pause state |
| `SensitivityManager.js` | User-adjustable sensitivity/difficulty slider |
| `ExerciseScripts/ExpressionController_Unilateral.js` | Rep/set counting for single-expression exercises |
| `ExerciseScripts/ExpressionController_Bilateral.js` | Rep/set counting for left/right expression pairs |
| `My UI Scripts/SettingsUiManager.js` | Settings panel and bilateral toggle button logic |
| `GameScripts/` | Game mechanics (sphere, obstacles, platforms) — separate system |

---

## Adding a New Exercise

1. Create a new SceneObject with two children: a **FaceMaskVisual** and an **ExpressionController** script (choose Unilateral or Bilateral).
2. Assign a texture to the face mesh for visual feedback.
3. Configure the ExpressionController:
   - **Target**: the sibling FaceMaskVisual
   - **Face Mesh**: the FaceMeshVisual child of the head binding object
   - **Expression** (Unilateral) or **ExpressionLeft / ExpressionRight** (Bilateral): see [Snap expression list](https://docs.snap.com/api/lens-studio/Classes/OtherClasses#Expressions)
   - **Display Text**: instruction prompt shown to user
   - **Finish Text**: text shown when exercise is complete
   - **Expression Index**: integer starting at 0, determines sequence order
4. Add the expression name(s) to `InitalizationManager`'s `expressionNames` input array.
5. Update `GameManager`'s `maxIndex` to include the new exercise.

---

## Global State Reference

| Global | Set By | Read By | Description |
|--------|--------|---------|-------------|
| `global.Difficulty` | (TBD — see Known Issue) | ExpressionControllers | User difficulty setting (0.0–0.9) |
| `global.Sensitivity` | SensitivityManager | (TBD — see Known Issue) | Same value, inconsistent naming |
| `global.Pause` | PauseManager | ExpressionControllers | Whether exercise detection is paused |
| `global.requiredSets` | ExpressionControllers | ExpressionControllers | Sets needed to complete exercise |
| `global.requiredReps` | ExpressionControllers | ExpressionControllers | Reps per set needed |
| `global.SequenceExpression` | InitalizationManager | ExpressionControllers | Array of expression baseline data |
| `global.isTimer` | (TBD) | ExpressionController_Unilateral | Whether to use timer mode vs rep mode |
| `global.complete` | (TBD) | ExpressionController_Unilateral | Whether timer exercise is complete |
| `global.timerUpdate` | ExpressionController_Unilateral | (Timer script) | Signal to timer: 1=start, 2=stop |
