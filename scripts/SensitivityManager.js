// -----JS CODE-----
/**
 * SensitivityManager.js — User Difficulty / Sensitivity Setting
 *
 * Provides a slider UI that lets the user adjust how difficult exercises are.
 * The slider value is stored as global.Sensitivity (range: 0.0 to 0.9; capped at 0.9
 * because a value of 1.0 would make the rep threshold infinite).
 *
 * The sensitivity value scales the rep-detection threshold in ExpressionController scripts:
 *   threshold = (baseExpressionValue + 0.01) / (1 - difficulty)
 * A higher sensitivity → higher threshold → user must express more to count a rep.
 *
 * NOTE: This script sets global.Sensitivity, but ExpressionController scripts read
 * global.Difficulty. Verify these are wired together correctly and consider
 * standardizing to one global variable name.
 *
 * Inputs:
 *   sliderScript — ScriptComponent with a getSliderValue() API
 *   faceMesh     — RenderMeshVisual used to sample resting expression weights (GetExpressionMinValues, currently unused/TODO)
 */
// @input Component.ScriptComponent sliderScript
// @input Component.RenderMeshVisual faceMesh

const pubSub = require("./PubSubModule");
global.Sensitivity = 0.5;
global.ExpressionMinValues = {};

script.api.SensitivitySlider = function(){
    SetSensitivity();
 }

  /***
  * Toggle setting controls visibility
  */
 script.api.SettingsToggle = function(){
      script.sensitivityUI.enabled = !script.sensitivityUI.enabled;
      script.bilateralUI.enabled = !script.bilateralUI.enabled;
  }

  /***
  * Set value of global sensitivity to value of slider when changed.
  */
  function SetSensitivity(){
    var sliderValue = script.sliderScript.api.getSliderValue();
    // Dont allow to go to 1 bc then the slider says inf and cannot be displayed. 
    if (sliderValue > 0.9){
      sliderValue = 0.9
    }
    global.Sensitivity = sliderValue;
 }

// TODO use to determine user resting expression values.
  /***
  * get the resting value for all expressions
  */
 function GetExpressionMinValues(){
   let expressionsInSequence = Object.values(pubSub.EXPRESSIONS)
    expressionsInSequence.forEach(element => {
      ExpressionMinValues[element] = script.faceMesh.mesh.control.getExpressionWeightByName(element);
   });
  // print(ExpressionMinValues[pubSub.EXPRESSIONS.BrowsUpCenter]);
 }

pubSub.subscribe(pubSub.EVENTS.StartButtonClicked,
   GetExpressionMinValues
);
