// -----JS CODE-----
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
global.timerUpdate = 0;

/***
* Called once when onAwake
*/
function InitializeUserBaseExpressionValue() {
 // var functionsToCallAfterDelay = [Initialize, BindFunctionToRunEveryUpdate]
 // StartDelay(3, functionsToCallAfterDelay);
 // GetBaseExpressionValue();
    
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
    

  pubSub.publish(pubSub.EVENTS.SetExpressionRequiredSetText,  global.requiredSets.toString());
  pubSub.publish(pubSub.EVENTS.SetExpressionRequiredRepText,  global.requiredReps.toString());
  pubSub.publish(pubSub.EVENTS.SetExpressionPromptText, script.displayText);

  // Publish timer reset event
  pubSub.publish(pubSub.EVENTS.TimerReset);
  pubSub.publish(pubSub.EVENTS.TimerStart);

}

/***
* Set functions to be called every frame
*/
function BindFunctionToRunEveryUpdate() {
  var updateEvent = script.createEvent("UpdateEvent");
  updateEvent.bind(OnUpdate);
  global.timerUpdate = 0;
  global.complete = 0;
}

/***
* Grab user base expression values
/*
function GetBaseExpressionValue() {
  global.timerEnabled = false;
    print("bilat false");
  pubSub.publish(pubSub.EVENTS.SetExpressionPromptText, "Initializing, please not move for 3s");
  leftBaseExpressionValue = GetRawLeftWeight();

  rightBaseExpressionValue = GetRawRightWeight();
}

/***
* Start with a delay and invoke methods in list after delay complete
*/
/*
function StartDelay(seconds, functionList){
  var delayedEvent = script.createEvent("DelayedCallbackEvent");
  delayedEvent.bind(function(eventData)
  {
   executeFunctions(eventData, functionList);
  });
  delayedEvent.reset(seconds);

}
*/

/**
* function that executes all given functions

function executeFunctions(eventData, functions) {
 functions.forEach(func => func(eventData));
}
*/

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

  if(global.isTimer == true) {
    HoldExpression();
  } else {
    CountReps();
  } 
  UpdateCurrentDifficulty();
  UpdateVisual(script.target);
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
    currentMinDifficulty = rightBaseExpressionValue + 0.05
  }

  if (!isLeftDetectionOn){
    currentMinDifficulty = leftBaseExpressionValue + 0.05
  }

  currentDifficulty = currentMinDifficulty / ( 1 - difficulty);

  // cannot be detected over 1
  if (currentDifficulty > 1)
    currentDifficulty = 1;
}

function HoldExpression() {

  global.timerEnabled = true;
  // stop counting when hit required reps
  if (global.complete == 1){
    Finished();
    return;
  }

    var rawWeight = GetRawExpressionWeight();
     //print("adjusted " + adjustedWeight)
    if (rawWeight > currentDifficulty && midRep !== true){
        midRep = true;
        pubSub.publish(pubSub.EVENTS.TimerContinue);
      }

     var rawWeight = GetRawExpressionWeight();
     // print("raw " + rawWeight)
    if (rawWeight <= currentDifficulty && midRep === true){
        midRep = false;
        pubSub.publish(pubSub.EVENTS.TimerStop);
     }
}

/***
* Count completed reps, expression must return to base line bf another rep is counted.
*/
function CountReps() {
  // Update sets and reps text during exercise if changed
  pubSub.publish(pubSub.EVENTS.SetExpressionRequiredSetText,  global.requiredSets.toString());
  pubSub.publish(pubSub.EVENTS.SetExpressionRequiredRepText,  global.requiredReps.toString());

    //stop counting when hit required sets
    if (script.completedSets >= global.requiredSets && script.completedSets >= global.requiredSets){
        Finished();
        return;
    }

    // Update rep count text
    pubSub.publish(pubSub.EVENTS.SetExpressionSetText,  script.completedSets.toString() );
    pubSub.publish(pubSub.EVENTS.SetExpressionRepText,  script.completedReps.toString());

    var rawWeight = GetRawExpressionWeight();
    if (rawWeight > currentDifficulty && midRep !== true){
      midRep = true;
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
    //print("raw " + rawWeight)
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
  if(global.isTimer == true) {
         if (global.complete == 1){
            pubSub.publish(pubSub.EVENTS.SetExpressionPromptText, script.finishText);
  }
    } else {
         if (script.completedSets >= global.requiredSets && script.completedSets >= global.requiredSets) {
            pubSub.publish(pubSub.EVENTS.SetExpressionPromptText, script.finishText);
        }
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

        pubSub.publish(pubSub.EVENTS.HideTimer);
    // Publish timer reset event
    pubSub.publish(pubSub.EVENTS.TimerReset);
    pubSub.publish(pubSub.EVENTS.TimerHide);

    pubSub.publish(pubSub.EVENTS.SetExpressionSetText, script.completedSets.toString());
    pubSub.publish(pubSub.EVENTS.SetExpressionRepText, script.completedReps.toString());
    InitializeUserBaseExpressionValue();
  }
  else
  {
    script.enabled = false;
    script.target.enabled = false;
    // Publish timer stop event
    pubSub.publish(pubSub.EVENTS.TimerStop);
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



