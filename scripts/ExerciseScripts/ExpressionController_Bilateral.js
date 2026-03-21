// -----JS CODE-----
/**
 * ExpressionController_Bilateral.js — Rep/Set Counter for Left/Right Split Exercises
 *
 * Handles facial expression exercises where the expression is split into left and right sides
 * (e.g. "squintLeft" and "squintRight"). By default, both sides are averaged together.
 * The user (or therapist) can toggle individual sides off via the settings UI to accommodate
 * patients with asymmetric ability (e.g. facial paralysis on one side).
 *
 * Each instance represents one exercise and activates when GameManager publishes
 * ExpressionIndexEnabled with a matching expressionIndex.
 *
 * Side Toggle Behavior:
 *   - Both sides ON: combinedWeight = (leftWeight + rightWeight) / 2
 *   - Right side OFF: only rightWeight is used (camera-mirrored — see note below)
 *   - Left side OFF: only leftWeight is used
 *   - Both OFF: error state (prevented by SettingsUiManager which forces one side always on)
 *
 * Camera Mirroring Note:
 *   Due to the selfie camera being mirrored, expression labels are flipped visually.
 *   When the user turns off "left detection" in the UI, isLeftDetectionOn = false,
 *   and the code returns leftWeight (the expression labeled "left" by Snap maps to the
 *   user's right side as they see it in the mirror). This is intentional.
 *
 * Rep Threshold Formula:
 *   Both sides ON: threshold = ((leftBase + rightBase) / 2 + 0.05) / (1 - difficulty)
 *   One side OFF:  threshold = (singleSideBase + 0.01) / (1 - difficulty)
 *   where difficulty = global.Difficulty (0.0–0.9). Capped at 1.0.
 *
 * Inputs:
 *   target          — FaceMaskVisual whose opacity tracks combined expression intensity
 *   faceMesh        — RenderMeshVisual used to read expression weights each frame
 *   expressionRight — Snap expression name for the right-side expression (e.g. "squintRight")
 *   expressionLeft  — Snap expression name for the left-side expression (e.g. "squintLeft")
 *   displayText     — Instruction text shown during exercise
 *   finishText      — Text shown when all sets/reps are completed
 *   completedSets   — Tracks sets completed (reset to 0 when exercise activates)
 *   completedReps   — Tracks reps in current set (reset to 0 when exercise activates)
 *   baseDifficulty  — (Unused — difficulty read from global.Difficulty)
 *   expressionIndex — Integer index identifying this exercise in the sequence (starts at 0)
 *   apiScript       — (Unused reference, was used for remote data logging)
 */
// @input Component.FaceMaskVisual target
// @input Component.RenderMeshVisual faceMesh
// @input string expressionRight
// @input string expressionLeft
// @input string displayText
// @input string finishText
// @input number completedSets
// @input number completedReps
// @input number baseDifficulty
// @input number expressionIndex
// @input Component.ScriptComponent apiScript

const pubSub = require("../PubSubModule");

global.requiredSets = 3;
global.requiredReps = 5;

var midRep;
var color;
var difficulty;
var leftBaseExpressionValue = 0;
var rightBaseExpressionValue = 0;
var isRightDetectionOn;
var isLeftDetectionOn;
var currentDifficulty = 0;
// face mask visual disabled by default
script.target.enabled = false;

/***
* Called once when onAwake
*/
function InitializeUserBaseExpressionValue() {

  Initialize();
  BindFunctionToRunEveryUpdate();
}

function Initialize(){
  // Set initial values
  GetExpressionByNameBaseValue();
  currentDifficulty = (leftBaseExpressionValue + rightBaseExpressionValue) / 2 + 0.01;
  print("current difficulty" + currentDifficulty);
  // script.apiScript.sendDataToSite('sensitivity', currentDifficulty);

  midRep = false;
  color = script.target.getMaterial(0).getPass(0).baseColor;
  difficulty = global.Difficulty;
  SetBilateralDetection();

  // Display prompt text
  pubSub.publish(pubSub.EVENTS.SetExpressionRequiredSetText,  global.requiredSets.toString());
  pubSub.publish(pubSub.EVENTS.SetExpressionRequiredRepText,  global.requiredReps.toString());
  pubSub.publish(pubSub.EVENTS.SetExpressionPromptText, script.displayText);
}

/***
* Set functions to be called every frame
*/
function BindFunctionToRunEveryUpdate() {
  var updateEvent = script.createEvent("UpdateEvent");
  updateEvent.bind(OnUpdate);
}

/**
 * Get an expression from the sequence by its name
 */
function GetExpressionByNameBaseValue() {
   for (let i = 0; i < global.SequenceExpression.length; i++) {
      if (global.SequenceExpression[i].name === script.expressionRight) {
        rightBaseExpressionValue = global.SequenceExpression[i].baseValue;
      }
       if (global.SequenceExpression[i].name === script.expressionLeft) {
        leftBaseExpressionValue = global.SequenceExpression[i].baseValue;
      }
   }
}


/***
* Things to be called every frame
*/
// implememt some sort of pause to pause the detection / game while we re do base expression initalization.
// global value pause controlled by pubsub pause and unpause , like difficutly
//
function OnUpdate(){
  difficulty = global.Difficulty;

  if (global.Pause == true)
    return;

  CountReps();
  UpdateCurrentDifficulty();
  UpdateVisual(script.target);
  DetermineJump();
}

/***
* Update opacity of mask based on expression weight
*/
function UpdateVisual(visualComponent) {
  alpha = GetRawExpressionWeight();
  color = visualComponent.getMaterial(0).getPass(0).baseColor;
  visualComponent.getMaterial(0).getPass(0).baseColor = new vec4(color.r, color.g, color.b, alpha);
}

/***
* Set the current minimum value needed to count an expression display
*/
function UpdateCurrentDifficulty(){
  var currentMinDifficulty;
 
  if (isLeftDetectionOn && isRightDetectionOn ){
    currentMinDifficulty = ((leftBaseExpressionValue + rightBaseExpressionValue)/2) + 0.05
  }

  if (!isRightDetectionOn){
    currentMinDifficulty = rightBaseExpressionValue + 0.01
  }

  if (!isLeftDetectionOn){
    currentMinDifficulty = leftBaseExpressionValue + 0.01
  }

  currentDifficulty = currentMinDifficulty / ( 1 - difficulty);

  // cannot be detected over 1
  if (currentDifficulty > 1)
    currentDifficulty = 1;
}

/***
* Count completed reps, expression must return to base line bf another rep is counted.
*/
function CountReps() {
  // Update sets and reps text during exercise if changed
  pubSub.publish(pubSub.EVENTS.SetExpressionRequiredSetText,  global.requiredSets.toString());
  pubSub.publish(pubSub.EVENTS.SetExpressionRequiredRepText,  global.requiredReps.toString());

    //stop counting when hit required sets
    if (script.completedSets >= global.requiredSets){
        Finished();
        return;
    }

    // Update rep count text
    pubSub.publish(pubSub.EVENTS.SetExpressionSetText,  script.completedSets.toString() );
    pubSub.publish(pubSub.EVENTS.SetExpressionRepText,  script.completedReps.toString());

    var rawWeight = GetRawExpressionWeight();
    if (rawWeight > currentDifficulty && midRep !== true){
      midRep = true;
      print("rep counted, raw weight: " + rawWeight.toString() + " current difficulty: " + currentDifficulty.toString());
      script.completedReps += 1
      //script.apiScript.sendDataToSite('completedReps', script.completedReps);
      if (script.completedReps >= global.requiredReps){
          script.completedSets += 1;
          script.completedReps = 0;
      }
      pubSub.publish(pubSub.EVENTS.SetExpressionSetText,  script.completedSets.toString() );
      pubSub.publish(pubSub.EVENTS.SetExpressionRepText,  script.completedReps.toString());
    }

    var rawWeight = GetRawExpressionWeight();
    if (rawWeight <= currentDifficulty && midRep === true){
      midRep = false;
    }
 }

/***
* Publish expressions values for bilateral detection so the UI reflects its values.
*/
function SetBilateralDetection() {
  // set values to true for first time.
  if (isLeftDetectionOn == null)
    isLeftDetectionOn = true;
  if (isRightDetectionOn == null)
    isRightDetectionOn = true;

  print("Left" + isLeftDetectionOn);
  print("right" + isRightDetectionOn);

  // enable bilateral controls
  pubSub.publish(pubSub.EVENTS.SetBilateralDetection, true);
  // set right/left buttons on/off
  pubSub.publish(pubSub.EVENTS.SetBilateralDetection_Left, isLeftDetectionOn);
  pubSub.publish(pubSub.EVENTS.SetBilateralDetection_Right, isRightDetectionOn);
 }

/**
* Gets the raw expression weight for both or one side of the expression.
* Note that the expression weights are flipped.
* i.e left = on, return right weight.
*/
function GetRawExpressionWeight(){
  var leftWeight = GetRawLeftWeight();
  var rightWeight = GetRawRightWeight();
  var combinedWeight = (leftWeight + rightWeight) / 2
  DisplayDebug(leftWeight, rightWeight, combinedWeight)

      print("right detection is " + isRightDetectionOn);
      print("left detection is " + isLeftDetectionOn);
  if (!isLeftDetectionOn && !isRightDetectionOn ){
    print("an error has occurred and both left and right side detection is off for expression")
  }

  if (!isRightDetectionOn){
    return rightWeight;
  }

  if (!isLeftDetectionOn){
    return leftWeight;
  }

  return combinedWeight
}

function GetRawLeftWeight(){
  return script.faceMesh.mesh.control.getExpressionWeightByName(script.expressionLeft);
}

function GetRawRightWeight(){
  return  script.faceMesh.mesh.control.getExpressionWeightByName(script.expressionRight);
}
/**
 * Display finished text
 */
function Finished(){
  if (script.completedSets >= global.requiredSets){
    pubSub.publish(pubSub.EVENTS.SetExpressionPromptText, script.finishText);
  }
}

/**
 * Display value for debugging
 */
function DisplayDebug(leftWeight, rightWeight, combinedWeight){
  if (!isRightDetectionOn){
    leftWeight = 0
  }

  if (!isLeftDetectionOn){
    rightWeight = 0
  }

  pubSub.publish(pubSub.EVENTS.SetMinExpressionWeightText,  currentDifficulty.toFixed(3).toString());
  pubSub.publish(pubSub.EVENTS.SetCombinedText, combinedWeight.toFixed(3).toString());
  pubSub.publish(pubSub.EVENTS.SetLeftDebugText, rightWeight.toFixed(3).toString());
  pubSub.publish(pubSub.EVENTS.SetRightDebugText, leftWeight.toFixed(3).toString());

}

/**
 * Calculate jump amount based on sensitivity
 * Send jump to sphere controller
 */
function DetermineJump(){
  var weight = GetRawExpressionWeight();
  //  Listened to by sphereController
  pubSub.publish(pubSub.EVENTS.SetJumpAmount, weight);
}


/*SUBSCRIPTIONS*/

/***
* Enable this script/exercise if the parameter matched the expressionIndex value. 
* Initialize values
* Disable/enable visuals
* Start detecting on frame update
* Always set reps back to 0 when leave a exercise
*/
pubSub.subscribe(pubSub.EVENTS.ExpressionIndexEnabled, (data) => {
  if(data == script.expressionIndex)
  {
    script.enabled = true;
    script.target.enabled = true;
    script.completedSets = 0;
    script.completedReps = 0;
    pubSub.publish(pubSub.EVENTS.SetExpressionSetText, script.completedSets.toString());
    pubSub.publish(pubSub.EVENTS.SetExpressionRepText, script.completedReps.toString());
    InitializeUserBaseExpressionValue();
  }
  else
  {
    script.enabled = false;
    script.target.enabled = false;
  }
});

/***
* Determine if should detect left side movement based on UI buttons being toggled
*/
pubSub.subscribe(pubSub.EVENTS.ToggleBilateralDetection_Left, (data) => {
  isLeftDetectionOn = data
});

/***
* Determine if should detect right side movement based on UI buttons being toggled
*/
pubSub.subscribe(pubSub.EVENTS.ToggleBilateralDetection_Right, (data) => {
  isRightDetectionOn = data
});

