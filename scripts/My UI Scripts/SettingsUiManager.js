// -----JS CODE-----
/**
 * SettingsUiManager.js — Settings Panel and Bilateral Toggle Button Manager
 *
 * Manages the settings UI panel visibility and the bilateral side-detection toggle buttons.
 * The bilateral toggles allow the user to choose which side(s) of a bilateral expression
 * to detect — useful for patients with asymmetric facial ability.
 *
 * UI Panels:
 *   difficultyUI  — Difficulty/sensitivity slider panel
 *   countUI       — Rep/set count display panel
 *   controlsUI    — Exercise control buttons panel
 *   bilateralUI   — Left/right detection toggle panel
 *   debugUI       — Debug info panel (expression weights, thresholds)
 *
 * Bilateral Toggle Constraint:
 *   Both sides cannot be turned off simultaneously. If the user tries to turn off one side
 *   while the other is already off, the other side is automatically turned back on.
 *   This is enforced in ToggleOffLeft() and ToggleOffRight().
 *
 * Exposed script methods (called by UI button tap events):
 *   script.ToggleUI          → shows/hides the settings panels
 *   script.ToggleDebugUI     → shows/hides the debug panel
 *   script.ToggleOn_Left     → turns on left-side detection
 *   script.ToggleOn_Right    → turns on right-side detection
 *   script.ToggleOff_Left    → turns off left-side detection (auto-enables right if needed)
 *   script.ToggleOff_Right   → turns off right-side detection (auto-enables left if needed)
 *
 * PubSub events published:
 *   ToggleBilateralDetection_Left  — notifies ExpressionController of left toggle state
 *   ToggleBilateralDetection_Right — notifies ExpressionController of right toggle state
 *
 * PubSub events subscribed:
 *   SetBilateralDetection_Left  — syncs left toggle button state from exercise controller
 *   SetBilateralDetection_Right — syncs right toggle button state from exercise controller
 *   SetBilateralDetection       — enables/disables the bilateral toggle buttons entirely
 *                                  (disabled for unilateral exercises)
 *
 * Inputs:
 *   bilateralToggle_left  — ScriptComponent with toggleOn()/toggleOff()/getToggleValue() API
 *   bilateralToggle_right — ScriptComponent with toggleOn()/toggleOff()/getToggleValue() API
 */
// @input SceneObject difficultyUI
// @input SceneObject countUI
// @input SceneObject controlsUI
// @input SceneObject bilateralUI
// @input SceneObject debugUI
// @input Component.ScriptComponent bilateralToggle_left
// @input Component.ScriptComponent bilateralToggle_right

const pubSub = require("../PubSubModule");
script.ToggleOn_Left = ToggleOnLeft;
script.ToggleOn_Right = ToggleOnRight;
script.ToggleOff_Left = ToggleOffLeft
script.ToggleOff_Right = ToggleOffRight;
script.ToggleUI = ToggleUI;
script.ToggleDebugUI = ToggleDebugUI;

/***
 * Toggle UI
 */
function ToggleUI(){
    print("button hit")
    print(script.difficultyUI.enabled);
    script.difficultyUI.enabled = !script.difficultyUI.enabled;
    script.controlsUI.enabled = !script.controlsUI.enabled;
    script.countUI.enabled = !script.countUI.enabled;
}

/***
 * Toggle debug UI
 */
function ToggleDebugUI(){
    script.debugUI.enabled = !script.debugUI.enabled;
}

/***
 * Publish bilateral controls being toggle on/off
 */
function ToggleOnLeft(){
    pubSub.publish(pubSub.EVENTS.ToggleBilateralDetection_Left, true);
    script.bilateralToggle_left.toggleOn();
}

function ToggleOnRight(){
    pubSub.publish(pubSub.EVENTS.ToggleBilateralDetection_Right, true);
    script.bilateralToggle_right.toggleOn();
}

function ToggleOffLeft (){
    pubSub.publish(pubSub.EVENTS.ToggleBilateralDetection_Left, false);
    script.bilateralToggle_left.toggleOff();
    print("toggle off left should turn on right")
    // cannot turn of both side, if off right side detection is turned on
    var rightIsOff = !script.bilateralToggle_right.getToggleValue();
    if (rightIsOff)
        print("toggle of left turn on right")
        ToggleOnRight();
}

function ToggleOffRight(){
    pubSub.publish(pubSub.EVENTS.ToggleBilateralDetection_Right, false);
    script.bilateralToggle_right.toggleOff();
    print("toggle of right should turn on left")
    // cannot turn of both side, if off left side detection is turned on
    var leftIsOff = !script.bilateralToggle_left.getToggleValue();
    if (leftIsOff)
        print("toggle of right turn on left")
        ToggleOnLeft();
}

/***
  * Set left button on/off based on data
  */
pubSub.subscribe(pubSub.EVENTS.SetBilateralDetection_Left, (data) => {

    if(script.bilateralToggle_left){
        print("toggle on")
        switch(data){
            case true:
                script.bilateralToggle_left.toggleOn();
                break;
            case false:
                script.bilateralToggle_left.toggleOff();
                break;
            default:
                print("ERROR")
                break;
        }
    }
});

/***
* Set right button on/off based on data
*/
pubSub.subscribe(pubSub.EVENTS.SetBilateralDetection_Right, (data) => {
    if(script.bilateralToggle_right.enabled){
        switch(data){
            case true:
            script.bilateralToggle_right.toggleOn();
            break;
            case false:
                script.bilateralToggle_right.toggleOff();
                break;
            default:
                print("ERROR")
                break;
        }
    }
});

/***
  * Set button enabled/disabled based on data
  */
pubSub.subscribe(pubSub.EVENTS.SetBilateralDetection, (data) => {

      switch(data){
        case true:
            script.bilateralToggle_left.enabled = true;
            script.bilateralToggle_right.enabled = true;
            break;
        case false:
            script.bilateralToggle_left.enabled = false;
            script.bilateralToggle_right.enabled = false;
            break;
        default:
            print("ERROR")
            break;
    }
  });

