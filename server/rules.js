const rules = require('./rules.json');


exports.processPacket = function(data) {
    var returnedRules = []
    //Preprocess
    //This should never be a problem, but to be safe
    if (data.ip !== undefined){
        ruleIpDst = ipRuleProcessing(data.ip.dst, rules.dstip)
        returnedRules.push(ruleIpDst)

        ruleIpSrc = ipRuleProcessing(data.ip.src, rules.srcip)
        returnedRules.push(ruleIpSrc)
    }

    if (data.transport !== undefined){
        ruleDstPort = portRuleProcessing(data.transport.dst, rules.dstport)
        returnedRules.push(ruleDstPort)

        ruleSrcPort = portRuleProcessing(data.transport.src, rules.srcport)
        returnedRules.push(ruleSrcPort)
    }

    //Get highest severity rule
    var highSev = Math.max.apply(Math,returnedRules.map(function(o){if(o === undefined){
        return -1
    }else{
        return o.severity
        };}))
    if (highSev !== -1){
        var highRule = returnedRules.find(function(o){ return o.severity === highSev})
    }
    else if(highSev === 9001){
        //Allows user to drop traffic to visualization
        return
    }
    else{
        var highRule = undefined
    }
    if (highRule){
        data['severity'] = highRule.severity;
        data['rulename'] = highRule.name;
        data['trigger'] = highRule.triggerMessage;
    }
    else{
        data['severity'] = 0
        data['rulename'] = "No Rule"
        data['trigger'] = "Isn't caught by current rules";
    }
    //Pick rule for dst
    if(( ruleIpDst !== undefined && ruleDstPort !== undefined) && ruleIpDst.severity >= ruleDstPort.severity || (ruleIpDst !== undefined && ruleDstPort === undefined)){
        //need, group, expiration
        data['groupdst'] = ruleIpDst.group
        //seconds
        data['expirationdst'] = ruleIpDst.expiration
    }
    else if(ruleDstPort !== undefined){
        //need, group, expiration
        data['groupdst'] = ruleDstPort.group
        //seconds
        data['expirationdst'] = ruleDstPort.expiration
    }
    else{
        //need, group, expiration
        data['groupdst'] = 0
        //seconds
        data['expirationdst'] = 30
    }

    //Pick rule for src
    if(( ruleIpSrc !== undefined && ruleSrcPort !== undefined) && ruleIpSrc.severity >= ruleSrcPort.severity || (ruleIpSrc !== undefined && ruleSrcPort === undefined)){
        //need, group, expiration
        data['group'] = ruleIpSrc.group
        //seconds
        data['expiration'] = ruleIpSrc.expiration
    }
    else if(ruleSrcPort !== undefined){
        //need, group, expiration
        data['group'] = ruleSrcPort.group
        //seconds
        data['expiration'] = ruleSrcPort.expiration
    }
    else{
        //need, group, expiration
        data['group'] = 0
        //seconds
        data['expiration'] = 30
    }

    //Not helpful to user (perhaps level for better heiarchy)
    data['level'] = 1
    data['strength'] = .1
}


//RULE PROCESSING FUNCTIONS
//Want to do something on new data, write one of these and tie into websocket code

function ipRuleProcessing(ip, ipRules){
    ip = ip.split(".")
    var highestSevRule;
    for (var i = 0; i < ipRules.length; i++){
        if (highestSevRule === undefined || ipRules[i].severity > highestSevRule.severity){
            startip = ipRules[i].startip.split(".")
            endip = ipRules[i].endip.split(".")

            //check if its in range
            if(ip[0] >= startip[0] && ip[0] <= endip[0]){
                if(ip[1] >= startip[1] && ip[1] <= endip[1]){
                    if(ip[2] >= startip[2] && ip[2] <= endip[2]){
                        if(ip[3] >= startip[3] && ip[3] <= endip[3]){
                            highestSevRule = ipRules[i]
                        }
                    }
                }
            }
        }
    }
    return highestSevRule
}

function portRuleProcessing(port, portRules){
    var highestSevRule;
    for (var i = 0; i < portRules.length; i++){
        if (highestSevRule === undefined || portRules[i].severity > highestSevRule.severity){
            if(port >= portRules[i].startport && port <= portRules[i].endport){
                highestSevRule = portRules[i]
            }
        }
    }
    return highestSevRule
}

