// -----JS CODE-----
/**
 * StillnessManager.js — Inactive Side Stillness Tolerance Setting
 *
 * Provides a slider that controls how much the inactive side of a bilateral exercise
 * is allowed to move before a rep is rejected. This value is used by
 * ExpressionController_Bilateral.IsInactiveSideViolating().
 *
 * Formula (in ExpressionController_Bilateral):
 *   inactiveSideThreshold = inactiveSideBaseValue + global.StillnessTolerance
 *
 * Slider range: 0.0 to 0.5 (capped at 0.5)
 *   Low value  → strict, inactive side must barely move above baseline
 *   High value → lenient, inactive side can move more before rejecting a rep
 *
 * Default: 0.1 — a small tolerance above baseline to account for natural micro-movement.
 *
 * Input:
 *   sliderScript — ScriptComponent with a getSliderValue() API (same pattern as SensitivityManager)
 *
 * Scene Setup (TODO — must be done in Lens Studio):
 *   1. Add this script to a SceneObject (e.g. a child of the bilateralUI panel so it is only
 *      visible when bilateral controls are shown).
 *   2. In the Inspector, assign the slider ScriptComponent to the `sliderScript` input.
 *   3. On the slider component's onChange event, call `script.api.StillnessSlider()`.
 *   4. The slider UI should only be visible when one bilateral side is toggled off
 *      (it has no effect when both sides are active).
 */
// @input Component.ScriptComponent sliderScript

global.StillnessTolerance = 0.1;

/***
 * Called by the slider UI component when the slider value changes.
 */
script.api.StillnessSlider = function() {
    SetStillnessTolerance();
};

function SetStillnessTolerance() {
    var sliderValue = script.sliderScript.api.getSliderValue();
    if (sliderValue > 0.5) {
        sliderValue = 0.5;
    }
    global.StillnessTolerance = sliderValue;
}
