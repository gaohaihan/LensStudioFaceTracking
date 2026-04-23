/* // NOTE: This file contains code for accessing an external API encapsulated as a JS module. You should not modify this file.
 * // Instead, you should modify the "Sensitivity API" script and access the functions through the imported class wrapper.
*/

/*
 * @param {RemoteApiResponse} response A raw API response from an Sensitivity API
 * @param {function} cb A callback to call with error and result data once the response has been parsed and error checked
 *
*/

function handleAPIResponse(response, cb) {
    if (response.statusCode !== 1) {
        var errorMessage = getErrorMessage(response);
    //    print(errorMessage);
        cb(true, errorMessage);
    } else {
        try {
            var parsedBody = JSON.parse(response.body);
        } catch (e) {
            var errorMessage = "ERROR: Failed to parse response";
            print(errorMessage);
            if (cb) {
                cb(true, errorMessage);
            }
            return;
        }
        if (cb) {
            cb(false, parsedBody);
        }
    }
}

function getErrorMessage(unparsedResponse) {
    var bugText = " - Please report this as a bug.";
    var errorMessage = "API Call Error - " + getErrorCodeMessage() + ": " + unparsedResponse.body;
    return errorMessage;

    // https://docs.snap.com/api/lens-studio/Classes/ScriptObjects/#RemoteApiResponse--statusCode
    function getErrorCodeMessage() {
        switch(unparsedResponse.statusCode) {
            case 0: return "Unknown Status Code"+bugText;
            case 1: return "Success";
            case 2: return "Redirected";
            case 3: return "Bad Request";
            case 4: return "Access Denied";
            case 5: return "Api Call Not Found";
            case 6: return "Timeout";
            case 7: return "Request Too Large";
            case 8: return "Server Processing Error";
            case 9: return "Request cancelled by caller";
            case 10: return "Internal: Framework Error";
        }
    }
}

function ApiModule(remoteServiceModule) {
    this.remoteServiceModule = remoteServiceModule;
}

function setParameter(paramKey, paramValue, parameters, isOptional) {
    if (paramValue != null) {
        parameters[paramKey] = paramValue;
    } else if (paramValue == null && !isOptional) {
        throw (paramKey + " is a required parameter. Please input a valid value.");
    }
}

ApiModule.prototype.difficulty = function(cb) {
    var req = global.RemoteApiRequest.create();
    req.endpoint = "sensitivity";
    this.remoteServiceModule.performApiRequest(req, function(response) {
        if(cb) {
            handleAPIResponse(response, cb);
        }
    });
};

ApiModule.prototype.sendData = function(datatype, data, cb) {
    var req = global.RemoteApiRequest.create();
    req.endpoint = "sendDataFromLens";

    // Define parameters object
    var parameters = {};

    // Set the parameter
    setParameter(datatype, data, parameters, false);

    // Attach parameters to request
    req.parameters = parameters;
    
    this.remoteServiceModule.performApiRequest(req, function(response) {
        if(cb) {
            handleAPIResponse(response, cb);
        }
    });
};

module.exports.ApiModule = ApiModule;
