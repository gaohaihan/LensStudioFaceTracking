/**
 * InitalizationManager.js — Expression Baseline Calibration
 *
 * Captures the user's resting expression values for all expressions in the exercise sequence.
 * Because every user's face is different, the "resting" value of any given expression
 * (e.g. squintRight) may not be 0.0. This calibration step ensures rep thresholds are
 * calculated relative to each individual user's baseline rather than an assumed zero.
 *
 * Called at exercise start via the InitializeBaseExpressions event. Results are stored in:
 *   global.SequenceExpression = [{ name, isBiLateral, baseValue }, ...]
 *
 * ExpressionController scripts look up their expression's baseValue from this array when
 * initializing, and use it in the threshold formula:
 *   threshold = (baseValue + 0.01) / (1 - difficulty)
 *
 * Inputs:
 *   faceMesh        — RenderMeshVisual used to sample current expression weights
 *   expressionNames — Array of expression name strings to capture (must include all
 *                     expressions used by ExpressionControllers in the sequence)
 *
 * Note: "isBiLateral" is determined by checking if the expression name contains "left".
 */
// @input Component.RenderMeshVisual faceMesh
//@input string[] expressionNames
const pubSub = require("./PubSubModule");

function InitializeBaseExpressionsForSequence(){
   // print("⚠️ INITIALIZING BASE EXPRESSIONS - Stack trace:");
    //print(new Error().stack); 
    CreateExpressionList();
    return;
}

function CreateExpressionList(){
    for(let i = 0; i < script.expressionNames.length; i++){
        if(script.expressionNames[i].includes("left")){
            var isBiLateral = true;
        } else {
            var isBiLateral = false;
        }
        var expressionName = script.expressionNames[i];
        var baseValue =  script.faceMesh.mesh.control.getExpressionWeightByName(expressionName);
        global.SequenceExpression.push(new expression(expressionName, isBiLateral, baseValue));
      //  print("Base value for " + SequenceExpression[i].name + " is " + baseValue + ", is bilateral: " + SequenceExpression[i].isBiLateral + " expression is added");
    }
    return;
}


class expression{
    constructor(name, isBiLateral, baseValue){
        this.name = name;
        this.isBiLateral = isBiLateral;
        this.baseValue = baseValue;
    }
}

 global.SequenceExpression =[];

 /**
  * Pause exercise and reinit base expression value.
  */
 pubSub.subscribe(pubSub.EVENTS.InitializeBaseExpressions, () => {
   InitializeBaseExpressionsForSequence();
 });


