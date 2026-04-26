let subscribers = {};

const EVENTS = {
    // GENERAL EVENTS
    SetExpressionPromptText: 'SetExpressionPromptText',
    SetExpressionRepText: 'SetExpressionRepText',
    SetExpressionSetText: 'SetExpressionSetText',
    SetExpressionRequiredSetText:'SetExpressionRequiredSetText',
    SetExpressionRequiredRepText: 'SetExpressionRequiredRepText',
    ExpressionIndexEnabled: 'ExpressionIndexEnabled',

    // PAUSE
    Pause: 'Pause',
    UnPause: 'UnPause',

    // MISC
    ReInitializeBaseExpression:"ReInitializeBaseExpression",

    // DEBUG EVENTS
    SetLeftDebugText: 'SetLeftDebugText',
    SetRightDebugText: 'SetRightDebugText',
    SetCombinedText: 'SetCombinedText',
    SetMinExpressionWeightText: 'SetMinExpressionWeightText',

    // BILATERAL EXERCISE EVENTS
    ToggleBilateralDetection_Left: 'ToggleBilateralDetection_Left',
    ToggleBilateralDetection_Right: 'ToggleBilateralDetection_Right',
    SetBilateralDetection_Left: 'SetBilateralDetection_Left',
    SetBilateralDetection_Right: 'SetBilateralDetection_Right',
    SetBilateralDetection: 'SetBilateralDetection',

    // EVENTS FOR BALANCE GAME
    SetPlatformRotation: "SetPlatformRotation",
    
    TimerStart: "TimerStart",
        TimerContinue: "TimerContinue",
    TimerStop: "TimerStop",
    TimerReset: "TimerReset",
    TimerTick: "TimerTick",
    TimerComplete: "TimerComplete",
    HideTimer: "HideTimer",
    ShowTimer: "ShowTimer"

};

const EXPRESSIONS = {
    JawOpen: 'JawOpen',
    BrowsUpCenter: 'BrowsUpCenter',
};

module.exports = {
    /**
     * Please me sure to have your types right,
     * the subscribe callback method may not be able to convert them to correct type.
     */
    publish(event, data) {
        // check for subscriber of event
        if (!subscribers[event]) return;
        // invoke call back methods for all subscribers to event
        subscribers[event].forEach(subscriberCallback =>
            subscriberCallback(data));
    },
    subscribe(event, callback) {
        if (!subscribers[event]) {
            // register event
            subscribers[event] = [];
        }
        // put call back function in event array
        subscribers[event].push(callback);
    },
    EVENTS,
    EXPRESSIONS
};

// USAGE
/*

// Subscribe to an event
pubsub.subscribe(EVENTS.EVENT_ONE, data => {
  console.log(`Received data for EVENT_ONE: ${data}`);
});

// Publish an event
pubsub.publish(EVENTS.EVENT_ONE, 'Hello from EVENT_ONE!');

*/