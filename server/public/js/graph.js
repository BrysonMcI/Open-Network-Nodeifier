//Update on websocket data

//If your frontend is lagging terrible (or you just want slower updates)
//Increase this value (is in ms)
var tickValue = 2000

//Rule severity level that triggers alerts
var severityForAlert = 7
var recentRuleTriggers = []

//How often to clear the alert refire block
var clearRecentRules = 10000

var baseNodes = [
]
var baseLinks = [
]
var nodes = [...baseNodes]
var links = [...baseLinks]
function getNeighbors(node) {
    return baseLinks.reduce(function (neighbors, link) {
        if (link.target.id === node.id) {
            neighbors.push(link.source.id)
        } else if (link.source.id === node.id) {
            neighbors.push(link.target.id)
        }
        return neighbors
    },
        [node.id]
    )
}
function isNeighborLink(node, link) {
    return link.target.id === node.id || link.source.id === node.id
}
function getNodeColor(node, neighbors) {
    if (Array.isArray(neighbors) && neighbors.indexOf(node.id) > -1) {
        return node.level === 1 ? 'blue' : 'green'
    }
    switch(node.group){
        case 0:
            return 'gray'
        case 1:
            return 'black'
        case 2:
            return 'yellow'
        case 3:
            return 'red'
    }
}
function getLinkColor(node, link) {
    return isNeighborLink(node, link) ? 'green' : '#E5E5E5'
}
function getTextColor(node, neighbors) {
    return Array.isArray(neighbors) && neighbors.indexOf(node.id) > -1 ? 'green' : 'black'
}
var width = Math.round(window.innerWidth - (window.innerWidth * .1))
var height = Math.round(window.innerHeight - (window.innerHeight * .1))
var svg = d3.select('svg')
// svg.attr('width', width).attr('height', height)
var linkElements,
    nodeElements,
    textElements
// we use svg groups to logically group the elements together
var linkGroup = svg.append('g').attr('class', 'links')
var nodeGroup = svg.append('g').attr('class', 'nodes')
var textGroup = svg.append('g').attr('class', 'texts')
// we use this reference to select/deselect
// after clicking the same element twice
var selectedId
// simulation setup with all forces
var linkForce = d3
    .forceLink()
    .id(function (link) { return link.id })
    .strength(function (link) { return link.strength })
var simulation = d3
    .forceSimulation()
    .force('link', linkForce)
    .force('charge', d3.forceManyBody().strength(-600))
    .force('centerX', d3.forceX(width / 2))
    .force('centerY', d3.forceY(height /2))
var dragDrop = d3.drag().on('start', function (node) {
    node.fx = node.x
    node.fy = node.y
}).on('drag', function (node) {
    simulation.alphaTarget(0.7).restart()
    node.fx = d3.event.x
    node.fy = d3.event.y
}).on('end', function (node) {
    if (!d3.event.active) {
        simulation.alphaTarget(0)
    }
    node.fx = node.x
    node.fy = node.y
})
// select node is called on every click
// we either update the data according to the selection
// or reset the data if the same node is clicked twice
function selectNode(selectedNode) {
    if (selectedId === selectedNode.id) {
        selectedId = undefined
        resetData()
        updateSimulation()
    } else {
        selectedId = selectedNode.id
        updateSimulation()
    }
    var neighbors = getNeighbors(selectedNode)
    // we modify the styles to highlight selected nodes
    nodeElements.attr('fill', function (node) { return getNodeColor(node, neighbors) })
    textElements.attr('fill', function (node) { return getTextColor(node, neighbors) })
    linkElements.attr('stroke', function (link) { return getLinkColor(selectedNode, link) })
}
// this helper simple adds all nodes and links
// that are missing, to recreate the initial state
function resetData() {
    var nodeIds = nodes.map(function (node) { return node.id })
    baseNodes.forEach(function (node) {
        if (nodeIds.indexOf(node.id) === -1) {
            nodes.push(node)
        }
    })
    links = baseLinks
}
// diffing and mutating the data
function updateData() {
    var newNodes = baseNodes.filter(function (node) {
        return nodes.indexOf(node.id) === -1
    })
    var diff = {
        removed: nodes.filter(function (node) { return newNodes.indexOf(node) === -1 }),
        added: newNodes.filter(function (node) { return nodes.indexOf(node) === -1 })
    }
    diff.removed.forEach(function (node) { nodes.splice(nodes.indexOf(node), 1) })
    diff.added.forEach(function (node) { nodes.push(node) })

    removedLinks = baseLinks.filter(function (link) {
        return nodes.indexOf(link.target) === -1 || nodes.indexOf(link.source) === -1
    })
    removedLinks.forEach(function(link) {
        baseLinks.splice(baseLinks.indexOf(link),1)
    });
    links = [...baseLinks]
}
function updateGraph() {
    // links
    linkElements = linkGroup.selectAll('line')
        .data(links, function (link) {
            return link.target.id + link.source.id
        })
    linkElements.exit().remove()
    var linkEnter = linkElements
        .enter().append('line')
        .attr('stroke-width', 1)
        .attr('stroke', 'rgba(50, 50, 50, 0.2)')
    linkElements = linkEnter.merge(linkElements)
    // nodes
    nodeElements = nodeGroup.selectAll('circle')
        .data(nodes, function (node) { return node.id })
    nodeElements.exit().remove()
    var nodeEnter = nodeElements
        .enter()
        .append('circle')
        .attr('r', 10)
        .attr('fill', function (node) { return getNodeColor(node, undefined) })
        .call(dragDrop)
        // we link the selectNode method here
        // to update the graph on every click
        .on('click', selectNode)
    nodeElements = nodeEnter.merge(nodeElements)
    // register custom right click behavior
    nodeElements.on("contextmenu", function(data, index) {
        d3.event.preventDefault();
        var info = document.getElementById('node-info');
        // purge the previous values from the list
        while (info.firstChild) {
            info.removeChild(info.firstChild);
        }
        // now show the new values
        for (let item in data) {
            var l = document.createElement('li');
            var t = document.createTextNode(item + ": " + data[item]);
            l.appendChild(t);
            info.appendChild(l);
        }
    });
    // texts
    textElements = textGroup.selectAll('text')
        .data(nodes, function (node) { return node.id })
    textElements.text(function (node) { return node.label });
    textElements.exit().remove()
    var textEnter = textElements
        .enter()
        .append('text')
        .text(function (node) { return node.label })
        .attr('font-size', 15)
        .attr('dx', 15)
        .attr('dy', 4)
    textElements = textEnter.merge(textElements)
}
function updateSimulation() {
    nodes = [...baseNodes]
    links = [...baseLinks]

    updateGraph()
    simulation.nodes(nodes).on('tick', () => {
        nodeElements
            .attr('cx', function (node) { return node.x })
            .attr('cy', function (node) { return node.y })
        textElements
            .attr('x', function (node) { return node.x })
            .attr('y', function (node) { return node.y })
        linkElements
            .attr('x1', function (link) { return link.source.x })
            .attr('y1', function (link) { return link.source.y })
            .attr('x2', function (link) { return link.target.x })
            .attr('y2', function (link) { return link.target.y })
    })
    simulation.force('link').links(links)

    simulation.alphaTarget(0.7).restart()
}
// last but not least, we call updateSimulation
// to trigger the initial render
updateSimulation()

var dns_table = {};

var socket = new WebSocket("ws://" + window.location.host + "/ws/webapp");
socket.onopen = function (evt) {
    alertify.success('Connected to Log Server');
}
socket.onerror = function (evt) {
    console.error("Connection Error");
}
socket.onmessage = function (evt) {
    var p = JSON.parse(evt.data);
    switch(p.type) {
        case 'dns': {
            //console.log('dns', p.data);    
            dns_table[p.data.ip] = p.data.name;
            break;
        }
        case 'traffic': {
            addPacket(p.data);
            break;
        }
        default: {
            console.log('received unknown data', p);
            return;
        }
    }
}
socket.onclose = function (evt) {
    alertify.message("Connection Closed");
}

function addPacket(data) {

    if (data.severity >= severityForAlert){
        var found = false
        for(var x = 0; x < recentRuleTriggers.length; x++){
           if (recentRuleTriggers[x].rulename  === data.rulename && recentRuleTriggers[x].trigger === data.trigger){
                found = true
           }
        }
        if(!found){
            recentRuleTriggers.push({rulename: data.rulename, trigger: data.trigger})
            alertify.warning('ALERT ON RULE: '+ data.rulename+ '. ON TRIGGER: '+  data.trigger);
        }
    }

    // How to check if it is in json list
    found = false;
    for (x = 0; x < baseNodes.length; x++){
        if (baseNodes[x].id === data.ip.src){
            found = true;
            var node1 = baseNodes[x];
            baseNodes[x].level = data.level;
            baseNodes[x].group = data.group;
            baseNodes[x].expiration = data.expiration;
            break;
        }
    }
    //if it isn't push this into nodes
    if(!found){
        var node1 = { "id": data.ip.src, "label": data.ip.src, "level": data.level, "group": data.group, "expiration" : data.expiration};
        baseNodes.push(node1)
    }
    // How to check if it is in json list
    found = false;
    for (x = 0; x < baseNodes.length; x++){
        if (baseNodes[x].id === data.ip.dst){
            found = true;
            baseNodes[x].level = data.leveldst;
            baseNodes[x].group = data.groupdst;
            baseNodes[x].expiration = data.expirationdst;
            var node2 = baseNodes[x];
            break;
        }
    }
    //if it isn't push this into nodes
    if(!found){
        var node2 = { "id": data.ip.dst, "label": data.ip.dst, "level": data.leveldst, "group": data.groupdst, "expiration" : data.expirationdst};
        baseNodes.push(node2)
    }
    found = false
    //check if link is established
    for (x = 0; x < baseLinks.length; x++){
        if (baseLinks[x].source.id === data.ip.src && baseLinks[x].target.id === data.ip.dst){
            found = true
            break
        }
    }
    if (!found){
        //add and update if not
        baseLinks.push({"source" : node1, "target": node2, "strength":  data.strength});
    }
    //otherwise graph doesn't need to change
}

function wait(ms){
    return new Promise(r => setTimeout(r,ms));
}

async function processTick(){
    while (true){
    //Update expiration time
    // -1 is never expire
    var x = baseNodes.length
    while(x--){
        if (baseNodes[x].expiration != -1 && !isNaN(baseNodes[x].expiration) ){
        baseNodes[x].expiration -= tickValue/1000
            if (baseNodes[x].expiration < 0){
                baseNodes.splice(x,x)
            }
        }
    }


    //Update the graph
    updateData();
    updateSimulation();
    await wait(tickValue)
    }
}

processTick()

setInterval(function(){
    recentRuleTriggers = []
}, clearRecentRules);

function showNames() {
    var c = 0;
    for (var i = 0; i < nodes.length; i++) {
        if (dns_table[nodes[i].id]) {
            nodes[i].label = dns_table[nodes[i].id];
            c++;
        }
    }
    return c;
}

function showIPs() {
    for (var i = 0; i < nodes.length; i++) {
        nodes[i].label = nodes[i].id;
    }
    return nodes.length;
}
