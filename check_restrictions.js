function readableOperator(operator, value_a, value_b) { 
    switch(operator) {
        case "==":
            return " is equal to " + value_a;
        case "!=":
            return "not equal to";
        case "<":
            return "less than";
        case "<=":
            return "less than or equal to";
        case ">":
            return "greater than";
        case ">=":
            return "greater than or equal to";
        case "inside":
            return "inside range";
        case "outside":
            return "outside range";
        default:
            return operator;
    }
}

function getLogLevel(value) {
    switch(value.toUpperCase()) {
        case "DEBUG":
            return 1;
        case "INFO":
            return 2;
        case "WARN":
            return 3;
        case "ERROR":
            return 4;
        default:
            return 1;
    }
}

function logThresholdMet(messageLevel) {
    if(getLogLevel(messageLevel) >= getLogLevel(gLogLevel)) {
        return true; 
    } else {
        return false;
    }
}

function log(messageLevel, message) {
    messageLevel = messageLevel.toUpperCase();
    message = messageLevel + "::" + message;
    
    if(logThresholdMet(messageLevel)) {
        switch(messageLevel) {
            case "DEBUG":
                break;
            case "INFO":
                node.warn(message);
                break;
            case "WARN":
                node.warn(message);
                break;
            case "ERROR":
                node.warn(message);
                break;
            default:
                node.warn(message);
        }
    }
}

var haref = global.get("homeassistant.homeAssistant.states");
var gLogLevel = haref["input_select.input_node_red_log_level"].state.toUpperCase() || "DEBUG";
var restrict = msg.restrict || false;
var restrictDescription = "Restriction in effect for " + node.name + ":";
var resList = msg.resList;
var fromNode = msg.restrictionBlock || "unknown_source";

var checkValue;
var currentValue;

for(var res in resList) {
    var r = resList[res];
    
    switch(r.rType) {
        case "device":
            checkValue = haref[r.lookupDevice].state;
            break;
        default:
            checkValue = r.rValue;
    }
    
    if(!isNaN(checkValue)) {
        checkValue = parseFloat(checkValue);
    }
    
    r.state = haref[r.device].state;
    
    if(!isNaN(r.state)) {
        r.state = parseFloat(r.state);
    }
    
    var prevValue = 0;

    switch(r.cOperator) {
        case "risesAbove":
            prevValue = flow.get(r.device + "_prev_" + r.cOperator) || r.state;
            if(r.state > checkValue && prevValue <= checkValue) {
                log("info", "Restriction: [[" + r.device +  "]] has risen above " + checkValue + " from " + prevValue + " to " + r.state + "..." + fromNode)
                restrict = true;
            }
            flow.set(r.device + "_prev_" + r.cOperator, r.state);
            break;
        case "risesToOrAbove":
            prevValue = flow.get(r.device + "_prev_" + r.cOperator) || 0;
            if(r.state >= checkValue && prevValue < checkValue) {
                log("info", "Restriction: [[" + r.device +  "]] has risen to or above " + checkValue + " from " + prevValue + " to " + r.state + "..." + fromNode)
                restrict = true;
            }
            flow.set(r.device + "_prev_" + r.cOperator, r.state);
            break;
        case "wasAbove":
            prevValue = flow.get(r.device + "_prev_" + r.cOperator) || r.state;
            if(r.state > checkValue && prevValue > checkValue) {
                log("info", "Restriction: [[" + r.device +  "]] was already above " + checkValue + ", previous value " + prevValue + " and current value " + r.state + "..." + fromNode)
                restrict = true;
            }
            flow.set(r.device + "_prev_" + r.cOperator, r.state);
            break;
        case "fallsBelow":
            prevValue = flow.get(r.device + "_prev_" + r.cOperator) || 0;
            if(r.state < checkValue && prevValue >= checkValue) {
                log("info", "Restriction: [[" + r.device +  "]] has fallen below " + checkValue + " from " + prevValue + " to " + r.state + "..." + fromNode)
                restrict = true;
            }
            flow.set(r.device + "_prev_" + r.cOperator, r.state);
            break;
        case "fallsToOrBelow":
            prevValue = flow.get(r.device + "_prev_" + r.cOperator) || 0;
            if(r.state <= checkValue && prevValue > checkValue) {
                log("info", "Restriction: [[" + r.device +  "]] has fallen to or below " + checkValue + " from " + prevValue + " to " + r.state + "..." + fromNode)
                restrict = true;
            }
            flow.set(r.device + "_prev_" + r.cOperator, r.state);
            break;
        case "wasBelow":
            prevValue = flow.get(r.device + "_prev_" + r.cOperator) || r.state;
            if(r.state < checkValue && prevValue < r.rValue) {
                log("info", "Restriction: [[" + r.device +  "]] was already below " + checkValue + ", previous value " + prevValue + " and current value " + r.state + "..." + fromNode)
                restrict = true;
            }
            flow.set(r.device + "_prev_" + r.cOperator, r.state);
            break;
        default:
            if(eval("r.state" + r.cOperator + " checkValue")) {
                restrict = true;
                log("info", "Restriction: [[" + r.device +  "]] because " + r.state + " " + readableOperator(r.cOperator, r.rValue) + " " + checkValue + "..." + fromNode)
            }
    }
}

msg.restrict = restrict;

if(restrict === false) {
    log("info", "No restrictions detected.");
}

return msg;
