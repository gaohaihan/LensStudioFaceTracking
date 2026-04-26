// -----JS CODE-----//
// @input Component.Text expressionTitleText
// @input SceneObject UiParent
// @input SceneObject startButton
// @input SceneObject prevButton
// @input SceneObject nextButton
// this index should include 0
// @input number maxIndex = 2;
// @input Asset.RemoteServiceModule remoteServiceModule
// @input Component.ScriptComponent apiScript
/**
 * TO CREATE A NEW EXPRESSION:
 * Start by creating a new object with two child objects: a face mask and an ExpressionController script.(Choose between a bilateral or unilateral)
 * Apply Texture to Face Mesh: Assign an appropriate texture to the face mesh by setting the Texture variable. This determines the material displayed when the expression is detected.
 * Configure ExpressionController:
   * Set the Target of the ExpressionController to the sibling face mask.
   * Specify the Face Mesh as the Face Mesh child of the head binding object.
   * Define the expression to detect using the Expression parameter. Refer to the list of detectable expressions for options. https://docs.snap.com/api/lens-studio/Classes/OtherClasses#Expressions
   * Set the prompt and finish text.
   * If the exercise requires repetitions, specify the number of required reps using the RequiredReps variable.
   * Currently, disregard the Min Expression Value parameter.
   * The Expression Index is an int value that starts at 0 and determines the order of the expression sequence.
 */

//import module
const Module = require("./RemoteServicesApiModule");
const ApiModule = new Module.ApiModule(script.remoteServiceModule);

const pubSub = require("./PubSubModule");
var currentIndex = 0;
script.prevButton.enabled = false;
script.nextButton.enabled = false;

script.CompleteExercise = GoToNextExercise;
script.Next = GoToNextExercise;
script.Previous = GoToPreviousExercise;
script.Start = InitializeBaseExpressionsThenStart;
script.PauseUnPause = PauseUnPause;
script.ReInit = ReInitBaseExpression;

 /***
  * Go to the Next exercise in the sequence and en/disable the prev and next button.
  */
function GoToNextExercise() {
   previousIndex = currentIndex;
   currentIndex += 1;

   // Publish timer reset event instead of setting global.timerUpdate
   pubSub.publish(pubSub.EVENTS.TimerReset);

   TryEnableNext();
   TryEnablePrev();

   pubSub.publish(pubSub.EVENTS.ExpressionIndexEnabled, currentIndex);
}

 /***
  * Go to the previous exercise in the sequence and en/disable the prev and next button.
  */
function GoToPreviousExercise() {
   previousIndex = currentIndex;
   currentIndex -= 1;
   // Publish timer reset event instead of setting global.timerUpdate
   pubSub.publish(pubSub.EVENTS.TimerReset);

   TryEnableNext();
   TryEnablePrev();

   pubSub.publish(pubSub.EVENTS.ExpressionIndexEnabled, currentIndex);
}

function InitializeBaseExpressionsThenStart(){
   pubSub.publish(pubSub.EVENTS.SetExpressionPromptText, "Initializing, please not move for 3s");
   var functionsToCallAfterDelay = [setText, EnableFirstExercise ]
   pubSub.publish(pubSub.EVENTS.InitializeBaseExpressions);


   StartDelay(3, functionsToCallAfterDelay);

   function setText(){
       pubSub.publish(pubSub.EVENTS.SetExpressionPromptText, "finished Initialization")
   }
}

 /***
  * Enable the first exercise in the sequence and some UI elements. Disable the start button.
  */
function EnableFirstExercise(){
   currentIndex = 0;
   TryEnableNext();
   script.startButton.enabled = false;

   // Publish timer reset event instead of setting global.timerUpdate
   pubSub.publish(pubSub.EVENTS.TimerReset);

   pubSub.publish(pubSub.EVENTS.ExpressionIndexEnabled, currentIndex);
}

/***
  * Toggles pause and unpause by publishing pause events
  */
function PauseUnPause(){
   if (global.Pause == true){
      pubSub.publish(pubSub.EVENTS.UnPause);
      // Publish timer start event instead of setting global.timerUpdate
      pubSub.publish(pubSub.EVENTS.TimerStart);
   }
   else {
      pubSub.publish(pubSub.EVENTS.Pause);
      // Publish timer stop event instead of setting global.timerUpdate
      pubSub.publish(pubSub.EVENTS.TimerStop);
   }
}

function ReInitBaseExpression(){
   pubSub.publish(pubSub.EVENTS.TimerReset);
        pubSub.publish(pubSub.EVENTS.TimerHide);

   pubSub.publish(pubSub.EVENTS.ReInitializeBaseExpression);
}

function TryEnableNext(){
   if (currentIndex == script.maxIndex)
   {
      script.nextButton.enabled = false
   }
   else
   {
      script.nextButton.enabled = true;
   }
}

function TryEnablePrev(){
   if (currentIndex == 0)
   {
      script.prevButton.enabled = false
   }
   else
   {
      script.prevButton.enabled = true;
   }
}

var event = script.createEvent("UpdateEvent");
event.bind(function(eventdata){
    script.apiScript.makeRequest()
});

/***
* Start with a delay and invoke methods in list after delay complete
*/
function StartDelay(seconds, functionList){
  var delayedEvent = script.createEvent("DelayedCallbackEvent");
  delayedEvent.bind(function(eventData)
  {
   executeFunctions(eventData, functionList);
  });
  delayedEvent.reset(seconds);

}

/**
 * function that executes all given functions
 */
function executeFunctions(eventData, functions) {
  functions.forEach(func => func(eventData));
}