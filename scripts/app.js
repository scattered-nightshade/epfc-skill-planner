"use strict";

const levelCap = 55;

let skills = [];
let combatSkills = [];
let items = [];

let skillsGraph;
let combatSkillsGraph;
let currentlyHoveredNode;

const emptyPlayer = {
    heldItems: [],
    bag: null,
    skills: new Set(),
    combatSkills: new Set(),
}

let player = {
    heldItems: [],
    bag: null,
    skills: new Set(),
    combatSkills: new Set(),
}

const bagSizes = { 
    satchel: 4, 
    backpack: 8, 
    duffel: 16 
};

// Exists just to show what properties can exist in a bag
const emptyBag = { 
    id: 0,
    space: 0,
    items: []
};

const itemGroups = {
    weaponsItemList: ['weaponprimary', 'weaponsecondary'],
    weaponmodsItemList: ['weaponmod'],
    toolsItemList: ['tools'],
    combatItemList: ['combat'],
    concealedItemList: ['concealed'],
    armourItemList: ['armour']
};

async function loadApp() {
    const skillsFile = await fetch('data/skills.json');
    skills = await skillsFile.json();

    skills.forEach(skill => {
        const skillClasses = calculateCalssFromPosition(skill.x, skill.y);

        skill.playerClass = skillClasses;
    });

    const combatSkillsFile = await fetch('data/combatskills.json');
    combatSkills = await combatSkillsFile.json();

    const itemsFile = await fetch('data/items.json');
    items = await itemsFile.json();

    createGraph();
    createCombatGraph();
    loadDataFromURL();

    updateInventory();
    populateItemsPanel();
}


//Idk how this actually works lol, just stole this from stackoverflow
function encodeBitflags(selectedSet) {
    let bitflag = 0n;

    selectedSet.forEach(id => {
        const index = parseInt(id);
        if (!isNaN(index)) {
            bitflag |= (1n << BigInt(index));
        }
    });

    return bitflag.toString();
}

function decodeBitflags(bitflags, skill, maxId = null) {
    if (!bitflags) {
        return;
    }
    
    if (!maxId) {
        return;
    }

    let bitflag;
    try {
        bitflag = BigInt(bitflags);
    } 
    catch (error) {
        return;
    }

    for (let index = 0; index <= maxId; index++) {
        if ((bitflag & (1n << BigInt(index))) !== 0n) {
            skill.add(index.toString());
        }
    }
}

function decodeInventoryBitflags(bitflags, targetInventory, maxId) {
    if (!bitflags) {
        return;
    }
    
    if (!maxId) {
        return;
    }

    let bitflag;
    try {
        bitflag = BigInt(bitflags);
    } 
    catch (error) {
        return;
    }

    for (let index = 0; index <= maxId; index++) {
        if ((bitflag & (1n << BigInt(index))) !== 0n) {
            targetInventory.push(index.toString());
        }
    }
}


function highestIdInList(list) {
    let max = -1;
    list.forEach(item => {
        const n = Number(item.id);
        if (!Number.isNaN(n) && n > max) max = n;
    });
    return max;
}

function updateURL() {
    const params = new URLSearchParams();

    if (player.skills.size > 0) {
        params.set('skills', encodeBitflags(player.skills));
    }

    if (player.combatSkills.size > 0) {
        params.set('combat', encodeBitflags(player.combatSkills));
    }

    if (player.heldItems.length > 0) {
        params.set('helditems', encodeBitflags(player.heldItems));
    }

    if (player.bag) {

        params.set('bag', player.bag.id);

        if (player.bag.items.length > 0) {
            params.set('bagitems', encodeBitflags(player.bag.items))
        }
    }

    const newUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
}

function loadDataFromURL() {
    const urlParams = new URLSearchParams(window.location.search);

    decodeBitflags(urlParams.get('skills'), player.skills, highestIdInList(skills));
    decodeBitflags(urlParams.get('combat'), player.combatSkills, highestIdInList(combatSkills));


    const heldBitflags = urlParams.get('helditems');
    if (heldBitflags) {
        player.heldItems = [];
        decodeInventoryBitflags(heldBitflags, player.heldItems, highestIdInList(items));
    }

    const bagId = urlParams.get('bag');
    if (bagId) {
        player.bag = {
            id: bagId,
            space: bagSizes[bagId],
            items: []
        };

        const bagItemsBitflags = urlParams.get('bagitems');
        if (bagItemsBitflags) {
            player.bag.items = [];
            decodeInventoryBitflags(bagItemsBitflags, player.bag.items, highestIdInList(items));
        }
    }

    skillsGraph.nodes().forEach(node => {
        setSkillImage(node);
    });
    
    combatSkillsGraph.nodes().forEach(node => {
        setCombatSkillImage(node);
    });

    updateSkillLines();
    updateInventory();
    
    updateStatOverview();
}


/*
This is needed because of how the website is setup, the initial tab loads just fine. 
But if you try to look at any other skill trees the graph loads at the origin which is at 0,0 but 0,0 is at the top left of the div that the graph is in
This happens because how how the tabs are setup with flexbox as well as them just being hidden on load
*/

function centerGraph(graph) {
    const container = graph.container();
    graph.pan({ x: container.clientWidth / 2, y: container.clientHeight / 2 });
}

function restart() {
    player = emptyPlayer;

    skillsGraph.nodes().forEach(node => {
        setSkillImage(node);
    });

    skillsGraph.edges().forEach(edge => {
        edge.style('line-color', '#888888');
    });

    combatSkillsGraph.nodes().forEach(node => {
        setCombatSkillImage(node);
    });

    updateInventory();
    updateStatOverview();
    updateURL();
}

function calculateClassFromSkillList() {
    let count = [0, 0, 0, 0, 0]; //Burgular, Hacker, Tech, Merc, Con Artist

    const classNameById = {
        "-1": "Freelancer",
        "1": "Burglar",
        "2": "Hacker",
        "3": "Tech",
        "4": "Mercenary",
        "5": "ConArtist",
        "12": "Ghost",
        "13": "Sabouteur",
        "14": "Commando",
        "15": "Thief",
        "23": "Specialist",
        "24": "Breacher",
        "25": "Infiltrator",
        "34": "Engineer",
        "35": "Spy",
        "45": "Assassin"
    };

    player.skills.forEach(skillId => {
        const selectedSkill = skills.find(_skill => _skill.id == skillId);

        if (!selectedSkill || !selectedSkill.playerClass) {
            return;
        }

        selectedSkill.playerClass.forEach(classId => {
            count[classId]++;                
        });
    });

    let highestCount = 0;
    let highestClass = -1;

    for (let i = 0; i < 5; i++) {
        if (count[i] > highestCount){
            highestCount = count[i];
            highestClass = i;
        }
    }

    if (highestClass == -1) {
        return classNameById[-1];
    }

    let threshold = 0.35;
    let nextHighest = 0;

    for (let i = 0; i < 5; i++) {
        if (i == highestClass) {
            continue;
        }
        const ratio = count[i] / highestCount;
        if (ratio > threshold) {
            threshold = ratio;
            nextHighest = i + 1;
        }
    }

    highestClass += 1;
    if (nextHighest != 0) {
        if (nextHighest > highestClass) {
            highestClass = highestClass * 10 + nextHighest;
        }
        else {
            highestClass = nextHighest * 10 + highestClass;
        }
    }

    return classNameById[highestClass];
}

function calculateCalssFromPosition(x, y) {
    const precise = ((Math.atan2(x, y)/ Math.PI) * 2.5 + 5.5) % 5;
    const floored = Math.floor(precise);
    const diff = precise - floored;
    const area = [ floored ];
    if (diff <= 0.15) {
        area.push(floored == 0 ? 4 : floored - 1);
    }
    else if (diff >= 0.85) {
        area.push(floored == 4 ? 0 : floored + 1);
    }

    return area;
}


// Skills

function createGraph() {
    const elements = [];

    skills.forEach(skill => {

        let skillType = '';
        if (skill.core_skill) {
            skillType = 'core'
        } 
        else if (skill.major_skill) {
            skillType = 'major'
        } 
        else {
            skillType = 'minor'
        }

        elements.push({
            data: { 
                id: skill.id, 
                label: skill.name,
                group: skill.group
            },
            position: {
                x: skill.x,
                y: skill.y
            },
            locked: true,
            grabbable: false,
            classes: skillType //+ " " + (skill.playerClass || []).map(classId => `class-${classId}`).join(" "),
        });

        skill.connections.forEach(connection => {
            elements.push({
                data: { 
                    source: skill.id, 
                    target: connection.trim()
                }
            });
        });
    });

    skillsGraph = cytoscape({
        container: document.getElementById('skill-web'),
        elements: elements,
        style: [
            { 
                selector: 'node', 
                style: { 
                    //'label': 'data(id)',
                    'overlay-padding': '0px',
                    'background-opacity': 0,
                    'background-image': function(skill) {
                        return `images/skills/${skill.data('group')}-grey.png`;
                    },
                    'background-fit': 'cover'
                },
            },

            
            //{ selector: '.class-0', style: { 'border-color': '#ff0000', 'border-width': 3 } },
            //{ selector: '.class-1', style: { 'border-color': '#00ff00', 'border-width': 3 } },
            //{ selector: '.class-2', style: { 'border-color': '#0000ff', 'border-width': 3 } },
            //{ selector: '.class-3', style: { 'border-color': '#ff8800', 'border-width': 3 } },
            //{ selector: '.class-4', style: { 'border-color': '#ff0088', 'border-width': 3 } },
            //{ selector: '.class-0.class-1', style: { 'border-color': '#ffff00', 'border-width': 6 } },
            //{ selector: '.class-1.class-2', style: { 'border-color': '#00ffff', 'border-width': 6 } },
            //{ selector: '.class-2.class-3', style: { 'border-color': '#ff00ff', 'border-width': 6 } },
            //{ selector: '.class-3.class-4', style: { 'border-color': '#ff8888', 'border-width': 6 } },
            //{ selector: '.class-0.class-4', style: { 'border-color': '#000000', 'border-width': 6 } },
            

            {
                selector: '.core',
                style: {
                    'width': '40',
                    'height': '40',
                }
            },
            {
                selector: '.major',
                style: {
                    'width': '40',
                    'height': '40',
                }
            },
            { 
                selector: 'edge', 
                style: { 
                    'width': 6, 
                    'line-color': '#888888' 
                } 
            }
        ],
        layout: { name: 'preset' },
        wheelSensitivity: 0.1,
        minZoom: 0.5,
        maxZoom: 5
    });

    skillsGraph.ready(() => {
        centerGraph(skillsGraph);
    });

    addSkillsNodeClickHandler();
    addHoverHighlight();
}


function addSkillsNodeClickHandler() {
    skillsGraph.on('tapstart', 'node', (event) => {
        const node = event.target;
        const skillId = node.id();
        const skill = skills.find(_skill => _skill.id == skillId);

        if (player.skills.has(skillId)) {
            if (canDeselect()) {
                player.skills.delete(skillId);
                setSkillImage(node);
            }
            else {
                return;
            }
        } 
        else {
            if (isSkillConnected(skill)){
                player.skills.add(skillId);
                setSkillImage(node);
            }
            else {
                return;
            }
        }

        updateSkillLines();
        updateStatOverview();
        updateURL();
    });
}

function addHoverHighlight() {

    skillsGraph.on('mouseover', 'node', (event) => {
        currentlyHoveredNode = event.target;
        refreshHighlight();
    });

    skillsGraph.on('mouseout', 'node', (event) => {
        currentlyHoveredNode = null;
        clearHighlight();
    });

    window.addEventListener('keydown', (event) => {
        if (event.key === 'Shift') {
            refreshHighlight();
        }
    });

    window.addEventListener('keyup', (event) => {
        if (event.key === 'Shift') {
            clearHighlight();
        }
    });

    function refreshHighlight() {
        if (!currentlyHoveredNode || !isShiftDown()) {
            clearHighlight();
            return;
        }

        const group = currentlyHoveredNode.data('group');

        skillsGraph.nodes().forEach(node => {
            if (node.data('group') == group) {
                node.style('background-image', `images/skills/${group}-yellow.png`);
            }
            else {
                setSkillImage(node);
            }
        });
    }

    function clearHighlight() {
        skillsGraph.nodes().forEach(node => {
            setSkillImage(node);
        });
    }

    function isShiftDown() {
        return window.event && window.event.shiftKey;
    }
}

function setSkillImage(node) {
    const group = node.data('group');

    if (player.skills.has(node.id())) {
        node.style('background-image', `images/skills/${group}.png`);
    } 
    else {
        node.style('background-image', `images/skills/${group}-grey.png`);
    }
}

function isSkillConnected(skill) {
    if (player.skills.size == 0 & skill.core_skill) {
        return true;
    }

    const selectedSkillNeighbours = skill.connections;
    return selectedSkillNeighbours.some(neighbour => player.skills.has(neighbour));
}

function canDeselect(skill) {
    return true; // Need to make it so that people cant de-select skills that would cause "stranded" skills
}

function updateSkillLines() {
    skillsGraph.edges().forEach(edge => {
        const preexistingSkill = player.skills.has(edge.source().id());
        const newSkill = player.skills.has(edge.target().id());

        if (preexistingSkill && newSkill) {
            edge.style('line-color', '#ffffff');
        } 
        else {
            edge.style('line-color', '#888888');
        }
    });
}

function calculateSkillPoints() {
    let total = 0;

    const mappedSelectedSkills = Array.from(player.skills).map(id => 
        skills.find(s => s.id == id)
    );

    // Count cores
    const coreSkills = mappedSelectedSkills.filter(s => s.core_skill);

    if (coreSkills.length > 0) {
        total += (coreSkills.length - 1) * 2;
    }

    // Major
    total += mappedSelectedSkills.filter(_skill => {
        return _skill.major_skill && !_skill.core_skill;
    }).length * 2;

    // Minor
    total += mappedSelectedSkills.filter(_skill => {
        return !_skill.major_skill && !_skill.core_skill;
    }).length;

    return total;
}





// Combat Skills

function createCombatGraph() {
    const elements = [];

    combatSkills.forEach(combatSkill => {
        elements.push({
            data: { 
                id: combatSkill.id, 
                label: combatSkill.name,
                group: combatSkill.group
            },
            position: {
                x: combatSkill.x,
                y: combatSkill.y
            },
            locked: true,
            grabbable: false,
        });

        combatSkill["mutual-exclusivity"].forEach(connection => {
            elements.push({
                data: { 
                    source: combatSkill.id, 
                    target: connection.trim()
                }
            });
        });
    });

    combatSkillsGraph = cytoscape({
        container: document.getElementById('combatSkills'),
        elements: elements,
        style: [
            { 
                selector: 'node', 
                style: { 
                    'overlay-padding': '0px',
                    'background-opacity': 0,
                    'background-image': function(combatSkill) {
                        return `images/combatSkills/${combatSkill.data('group')}-grey.png`;
                    },
                    'width': '110',
                    'height': '110',
                    'background-fit': 'cover'
                },
            },
            { 
                selector: 'edge', 
                style: { 
                    'width': 12, 
                    'line-color': '#888888' 
                } 
            }
        ],
        layout: { name: 'preset' },
        wheelSensitivity: 0.1,
        minZoom: 1,
        maxZoom: 3
    });

    skillsGraph.ready(() => {
        centerGraph(combatSkillsGraph);
    });

    addCombatSkillsNodeClickHandler();
}

function addCombatSkillsNodeClickHandler() {
    combatSkillsGraph.on('tapstart', 'node', (event) => {
        const node = event.target;
        const combatSkillId = node.id();
        const combatSkill = combatSkills.find(_skill => _skill.id == combatSkillId);

        const conflictingSkills = combatSkill["mutual-exclusivity"] || [];

        conflictingSkills.forEach(conflictId => {
            if (player.combatSkills.has(conflictId)) {
                player.combatSkills.delete(conflictId);

                const conflictingSkill = combatSkillsGraph.getElementById(conflictId);
                if (conflictingSkill) {
                    setCombatSkillImage(conflictingSkill);
                }
            }
        });

        if (player.combatSkills.has(combatSkillId)) {
            player.combatSkills.delete(combatSkillId);
            setCombatSkillImage(node);
        } 
        else {
            player.combatSkills.add(combatSkillId);
            setCombatSkillImage(node);
        }

        updateStatOverview();
        updateURL();
    });
}

function caclulateCombatSkillPoints() {
    let total = 0;

    total = player.combatSkills.size;

    return total;
}

function setCombatSkillImage(node) {
    const group = node.data('group');

    if (player.combatSkills.has(node.id())) {
        node.style('background-image', `images/combatSkills/${group}.png`);
    } 
    else {
        node.style('background-image', `images/combatSkills/${group}-grey.png`);
    }
}




function findItem(itemId) {
    return items.find(_item => {
        return _item.id == itemId;
    });
}

function modifyInventory(location, itemId, action) {
    const target = location == "held" ? player.heldItems : player.bag?.items;
    if (!target) return;

    if (action == "add") {
        target.push(itemId);
    }
    if (action == "remove") {
        const index = target.indexOf(itemId);
        if (index != -1) {
            target.splice(index, 1);
        }
    }
}

function getUsedSpace(itemsArray, location = 'held') {
    return itemsArray.reduce((used, id) => {
        const item = findItem(id);
        if (!item || item.space <= 0) {
            return used;
        }

        if (location == 'held' && ["weaponprimary", "weaponsecondary", "armour", "offhand"].includes(item.type)) {
            return used;
        }

        return used + item.space;
    }, 0);
}


function getHeldSpaceCap() {
    const base = 6;

    const esSkills = skills.filter(skill => {
        return player.skills.has(skill.id) && skill.group === "es";
    });

    const concealedPockets = player.heldItems.includes("21");
    return base + (esSkills.length >= 2 ? 2 : 0) + (concealedPockets ? 1 : 0);
}

function getBagSpaceCap() {
    if (player.bag) {
        return player.bag.space;
    }
    else {
        return 0;
    }
}

function getItemCount(itemId) {
    let count = player.heldItems.filter(id => {
        return id == itemId;
    }).length;

    if (player.bag) {
        count += player.bag.items.filter(id => {
            return id == itemId;
        }).length;
    }

    return count;
}

function checkItemCanFit(item, location) {
    let itemsArray = [];

    if (location == 'held') {
        itemsArray = player.heldItems;
    }
    else if (location == 'bag') {
        if (player.bag) {
            itemsArray = player.bag.items;
        }
        else {
            itemsArray = [];
        }
    }

    const used = getUsedSpace(itemsArray, location);

    let cap = 0;

    if (location == 'held') {
        cap = getHeldSpaceCap();
    }
    else if (location == 'bag') {
        cap = getBagSpaceCap();
    }

    const ignoredItems = ["weaponprimary", "weaponsecondary", "armour", "offhand"];

    if (location == 'held' && ignoredItems.includes(item.type)) {
        return true;
    }

    if (location == 'bag' && item.space <= 0) {
        return false;
    }

    return ((used + item.space) <= cap);
}


function getWeaponLimits() {
    let maxWeapons = 2;
    let maxPrimary = 1;

    const hasWOC = player.combatSkills.has("19");
    const hasFA = player.combatSkills.has("20");

    if (hasFA) { 
        maxWeapons = 3; maxPrimary = 2; 
    }
    else if (hasWOC) { 
        maxWeapons = 1; maxPrimary = 1; 
    }

    return { maxWeapons, maxPrimary };
}

function countWeapons() {
    let primary = 0;
    let secondary = 0;

    let bagItems = [];

    if (player.bag) {
        bagItems = player.bag.items;
    }

    const allItems = [...player.heldItems, ...bagItems];

    for (const id of allItems) {
        const item = findItem(id);
        if (!item) {
            continue;
        }

        if (item.type == "weaponprimary") {
            primary++;
        }

        if (item.type == "weaponsecondary") {
            secondary++;
        }
    }

    const total = primary + secondary;

    return { primary, secondary, total };
}

function canAddWeapon(item) {
    if (!item) {
        return false;
    }
    
    if (!itemGroups.weaponsItemList.includes(item.type)) {
        return true;
    }

    const limits = getWeaponLimits();
    const count = countWeapons();

    const newTotal = count.total + 1;
    const primaryAfterAdd = count.primary + (item.type == 'weaponprimary' ? 1 : 0);

    if (newTotal > limits.maxWeapons) {
        return false;
    }

    if (item.type == "weaponprimary" && primaryAfterAdd > limits.maxPrimary) {
        return false;
    }

    return true;
}



function tryAddItem(itemId, location = 'held', move = false) {
    const item = findItem(itemId);

    if (!item) {
        return;
    }

    if (!canAddWeapon(item)) {
        return;
    }

    if (!checkItemCanFit(item, location)) {
        return;
    }

    let count = getItemCount(itemId);
    if (move) {
        count -= 1;
    }
    if (item.cap > -1 && count >= item.cap) {
        return;
    }

    modifyInventory(location, itemId, 'add');

    if (move) {
        if (location === 'held') {
            modifyInventory('bag', itemId, 'remove');
        }
        if (location === 'bag') {
            modifyInventory('held', itemId, 'remove');
        }
    }

    updateInventory();
}





function equipBag(bagId) {
    if (bagId == "none") {
        player.bag = null;
        updateInventory();
        return;
    }

    player.bag = {
        id: bagId,
        space: bagSizes[bagId],
        items: []
    };

    updateInventory();
}


function getConcealedThreshold() {
    let threshold = 5;
    const inconSkills = skills.filter(skill => {
        return player.skills.has(skill.id) && skill.group === "incon";
    });
    const customHolsters = player.heldItems.includes("22");
    return threshold + (inconSkills.length >= 2 ? 1 : 0) + (customHolsters ? 1 : 0);
}

function canBeConcealed(item) {
    if (item.type !== "weapon") {
        return true;
    }

    return getConcealedThreshold() >= item.space;
}

function hasConcealedItem() {
    return player.heldItems.some(id => {
        const item = findItem(id);
        if (item) {
            return item.concealed;
        }
        else {
            return false;
        }
    });
}

function createItemHTML(item, location) {
    const container = document.createElement("div");
    container.classList.add("item");

    container.innerHTML = `
        <strong>${item.name}</strong><br>
        <small>${item.space} space</small>
        <small>Weight: ${item.weight}</small><br>
    `;

    if (location == "held") {
        container.innerHTML += `
            <button class="tab-button" onclick="tryAddItem('${item.id}', 'bag', true)"><img src="images/icons/backpack.png" width="30"></button>
            <button onclick="modifyInventory('held', '${item.id}', 'remove'); updateInventory()">Remove</button>
        `;
    } 
    else if (location == "bag") {
        container.innerHTML += `
            <button class="tab-button" onclick="tryAddItem('${item.id}', 'held', true)"><img src="images/icons/hand.png" width="30"></button>
            <button onclick="modifyInventory('bag', '${item.id}', 'remove'); updateInventory()">Remove</button>
        `;
    }

    return container;
}


function renderItems(containerId, itemsArray, location) {
    const itemContainer = document.getElementById(containerId);
    itemContainer.innerHTML = '';
    itemsArray.forEach(id => {
        itemContainer.appendChild(createItemHTML(findItem(id), location));
    });
}

function updateInventory() {
    document.getElementById("heldSpaceInfo").textContent = `${getUsedSpace(player.heldItems, 'held')} / ${getHeldSpaceCap()} space`;
    document.getElementById("bagSpaceInfo").textContent = player.bag ? `${getUsedSpace(player.bag.items, 'bag')} / ${getBagSpaceCap()} space` : "No bag equipped";

    renderItems("heldItems", player.heldItems, "held");
    if (player.bag) {
        renderItems("bagItems", player.bag.items, "bag")
    }
    else {
        document.getElementById("bagItems").innerHTML = "";
    }

    const bagChoiceElement = document.getElementById("bagChoiceContainer");
    const removeBagButton = document.getElementById("removeBagButton");
    if (player.bag != null) {
        bagChoiceElement.classList.add("hidden");
        removeBagButton.classList.remove("hidden");
    }
    else {
        bagChoiceElement.classList.remove("hidden");
        removeBagButton.classList.add("hidden");
    }

    updateURL();
    updateStatOverview();
}

function populateItemsPanel() {

    const _itemGroups = Object.entries(itemGroups);

    _itemGroups.forEach(([itemContainerId, itemTypes]) => {
        const container = document.getElementById(itemContainerId);
        if (!container) {
            return;
        }

        items.filter(item => {
            return itemTypes.includes(item.type);
        }).forEach(item => {
                const itemContainer = document.createElement("div");
                const br = document.createElement("br");

                itemContainer.classList.add("item");

                itemContainer.innerHTML = `
                    <strong>${item.name}</strong><br>
                    <small>Space: ${item.space}</small>
                    <small>Weight: ${item.weight}</small><br>
                    <button class="tab-button" onclick="tryAddItem('${item.id}', 'held', false);"><img src="images/icons/hand.png" width="30"></button>
                    <button class="tab-button" onclick="tryAddItem('${item.id}', 'bag', false);"><img src="images/icons/backpack.png" width="30"></button>
                `;
                container.appendChild(itemContainer);
                container.appendChild(br);
            });
    });
}

function getRawWeight() {
    let total = 0;

    for (const id of player.heldItems) {
        const item = findItem(id);
        if (item) {
            total += item.weight;
        }
    }

    if (player.bag) {
        for (const id of player.bag.items) {
            const item = findItem(id);
            total += item.weight;
        }
    }

    return total;
}

function getTotalWeight() {
    let total = 0;

    for (const id of player.heldItems) {
        const item = findItem(id);
        if (item) {
            total += item.weight;
        }
    }

    if (player.bag) {
        for (const id of player.bag.items) {
            const item = findItem(id);
            if (player.bag.bagId == 'backpack') {
                total += item.weight * 0.8;
            }
            else {
                total += item.weight;
            }
        }
    }

    return total;
}


//The actual important stuff

function updateStatOverview() {

    console.log(player);

    let weight = getTotalWeight();

    let agility = 0;
    let bruteStrength = 0;
    
    let conMaxStamina = 0;
    let conStamRegen = 0;
    let afDrillSpeed = 0;
    let fhLockpickSpeed = 0;
    let fhReloadSpeed = 0;
    let masDisguiseDetectionSpeed = 0;
    let disSuspiciousDetectionSpeed = 0;
    let lpDetectionSpeed = 0;
    let lpDodgeRate = 0;
    let eaHackSpeed = 0;
    let eaHackDetection = 0;
    let ciCritRate = 0;
    let ciHackResourceCost = 0;
    let teTechItems = 0;
    let sdCameraDetection = 0;

    let reDamageReduction = 0;
    let hpReloadSpeed = 0;
    let hpFasterAiming = 0;
    let scavCombatItemRechargeTime = 0;
    let arExtraAmmo = 0;
    let lsCritChance = 0;
    let vitMaxHealth = 0;
    let htCrouchedDodgeChance = 0;
    let exeDamageIncrease = 0;
    let vtDamageIncrease = 0;
    let wocExtraAmmo = 0;
    let wocReloadSpeed = 0;
    let tcDamageBoost = 0;
    let cdgDamageBoost = 0;
    let csCritDamage = 0;
    let osExtraExplosives = 0;
    let osSkills = 0


    const coreSkillsSelected = [];

    player.skills.forEach(id => {
        const skill = skills.find(_skill => _skill.id == id);

        if (!skill) {
            return;
        };

        if (skill.core_skill) {
            coreSkillsSelected.push(skill.name);
        }


        switch (skill.group) {
            case "ea":
                eaHackSpeed += 5;
                eaHackDetection -= 5;
                break;
            case "ci":
                ciHackResourceCost += 5;
                ciCritRate += 1.5;
                break;
            case "sd":
                sdCameraDetection += 4;
                break;
            case "te":
                teTechItems += 5;
                break;
            case "fh":
                fhLockpickSpeed += 5;
                fhReloadSpeed += 3;
                break;
            case "lp":
                lpDetectionSpeed += 4;
                lpDodgeRate += 3;
                break;
            case "dis":
                disSuspiciousDetectionSpeed += 5;
                break;
            case "mas":
                masDisguiseDetectionSpeed += 4;
                break;
            case "af":
                afDrillSpeed += 5;
                break;
            case "con":
                conMaxStamina += 6;
                conStamRegen += 0.03;
                break;
            case "agil":
                agility += 1;
                break;
            case "bs":
                bruteStrength += 1;
                break;
        }
    });

    player.combatSkills.forEach(id => {
        const combatSkill = combatSkills.find(_skill => _skill.id == id);

        if (!combatSkill) {
            return;
        };

        switch (combatSkill.group) {
            case "ma":
                break;
            case "arp":
                break;
            case "re":
                reDamageReduction += 20;
                break;
            case "hp":
                hpReloadSpeed += 20;
                hpFasterAiming += 20;
                break;
            case "ae":
                break;
            case "scav":
                scavCombatItemRechargeTime += 25;
                break;
            case "ar":
                arExtraAmmo += 25;
                break;
            case "br":
                break;
            case "ls":
                lsCritChance += 10;
                break;
            case "vit":
                vitMaxHealth += 20;
                break;
            case "ht":
                htCrouchedDodgeChance += 20;
                break;
            case "exe":
                exeDamageIncrease += 25;
                break;
            case "vt":
                vtDamageIncrease += 15;
                break;
            case "os":
                osExtraExplosives += 1;
                osSkills += 1;
                break;
            case "rc":
                break;
            case "fc":
                break;
            case "un":
                break;
            case "woc":
                wocExtraAmmo += 50;
                wocReloadSpeed += 20;
                break;
            case "fa":
                break;
            case "gs":
                break;
            case "reap":
                break;
            case "tc":
                tcDamageBoost += 20;
                break;
            case "cdg":
                cdgDamageBoost += 50;
                break;
            case "cs":
                csCritDamage += 100;
                break;
        }
    });

    const c4 = findItem("15");
    if (osSkills >= 2) {
        c4.cap = 2;
    }
    else {
        c4.cap = 1;
    }

    let excessWeight = 0;
    let excessRawWeight = 0;

    if (getTotalWeight() > 12) {
        excessWeight = getTotalWeight() - 12;
    }

    if (getRawWeight() > 12) {
        excessRawWeight = getRawWeight() - 12;
    }


    const skillPointsSpent = calculateSkillPoints();
    const skillPointsSpentElement = document.getElementById("pointsSpent");
    if (skillPointsSpent > levelCap) {
        skillPointsSpentElement.classList.add('over-limit');
        skillPointsSpentElement.classList.remove('at-limit');
    }
    else if (skillPointsSpent == levelCap) {
        skillPointsSpentElement.classList.add('at-limit');
        skillPointsSpentElement.classList.remove('over-limit');
    }
    else {
        skillPointsSpentElement.classList.remove('at-limit');
        skillPointsSpentElement.classList.remove('over-limit');
    }
    
    skillPointsSpentElement.innerText = skillPointsSpent;


    const combatSkillPointsSpent = caclulateCombatSkillPoints();
    const combatSkillPointsSpentElement = document.getElementById("combatPointsSpent");
    const combatSkillsCap = Math.floor(levelCap / 7)

    if (combatSkillPointsSpent > combatSkillsCap) {
        combatSkillPointsSpentElement.classList.add('over-limit');
        combatSkillPointsSpentElement.classList.remove('at-limit');
    }
    else if (combatSkillPointsSpent == combatSkillsCap) {
        combatSkillPointsSpentElement.classList.add('at-limit');
        combatSkillPointsSpentElement.classList.remove('over-limit');
    }
    else {
        combatSkillPointsSpentElement.classList.remove('at-limit');
        combatSkillPointsSpentElement.classList.remove('over-limit');
    }

    combatSkillPointsSpentElement.innerText = combatSkillPointsSpent;

    document.getElementById('class').innerText = calculateClassFromSkillList();
    document.getElementById('health').innerText = (100 + vitMaxHealth).toString();
    document.getElementById('stamina').innerText = (100 + conMaxStamina).toString();
    document.getElementById('staminaRegenRate').innerText = (15 * (1.0 + conStamRegen) * (agility >= 2 ? 1.5 : 1)).toString();
    document.getElementById('dodgeChance').innerText = (lpDodgeRate * ((excessRawWeight * 1.0208) + 1)).toString();
    document.getElementById('crouchedDodgeChance').innerText = ((lpDodgeRate + htCrouchedDodgeChance) * (excessRawWeight * 1.0208)).toString();
    document.getElementById('critChance').innerText = (ciCritRate + lsCritChance).toString();
    document.getElementById('reloadSpeed').innerText = (100 + fhReloadSpeed + wocReloadSpeed + hpReloadSpeed).toString();
    document.getElementById('appliedForceSpeed').innerText = (100 + afDrillSpeed).toString();
    document.getElementById('lockpickingSpeed').innerText = (100 + fhLockpickSpeed).toString();
    document.getElementById('hackingSpeed').innerText = (100 + eaHackSpeed).toString();
    document.getElementById('networkResourcesUsage').innerText = (1.0 - (ciHackResourceCost / 100)).toString();
    document.getElementById('techUseSpeed').innerText = (100 + teTechItems).toString();
    document.getElementById('crouchedDetectionSpeed').innerText = (1.0 - (lpDetectionSpeed / 100)).toString();
    document.getElementById('suspiciousDetectionSpeed').innerText = (1.0 - (disSuspiciousDetectionSpeed / 100)).toString();
    document.getElementById('disguisedDetectionSpeed').innerText = (1.0 - (masDisguiseDetectionSpeed / 100)).toString();
    document.getElementById('cameraDetectionSpeed').innerText = (1.0 - (sdCameraDetection / 100)).toString();
    document.getElementById('weight').innerText = weight.toString();
    document.getElementById('rawWeight').innerText = getRawWeight().toString();


    let coreSkillMessage = "";
    if (coreSkillsSelected.length == 0) {
        coreSkillMessage = "You need to select at least one core skill!";
    }
    //document.getElementById('coreSkillWarning').innerText = coreSkillMessage;
}


loadApp();