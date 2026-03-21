/**
 * PauseManager.js — Exercise Pause State
 *
 * Manages the global pause flag used by ExpressionController scripts to suspend
 * rep/set detection. When paused, ExpressionControllers return early from OnUpdate
 * without counting expressions.
 *
 * global.Pause is initialized to false (not paused) when this script loads.
 *
 * Events:
 *   Listens to pubSub.EVENTS.Pause   → sets global.Pause = true
 *   Listens to pubSub.EVENTS.UnPause → sets global.Pause = false
 *
 * Pause/UnPause is triggered by GameManager.PauseUnPause() which toggles based on
 * the current state.
 */
const pubSub = require("./PubSubModule");
global.Pause = false;

function Pause(){
  global.Pause = true;
}

function UnPause(){
  global.Pause = false;
}

/*SUBSCRIPTIONS*/
pubSub.subscribe(pubSub.EVENTS.Pause, () => {
  Pause();
});

pubSub.subscribe(pubSub.EVENTS.UnPause, () => {
  UnPause();
});