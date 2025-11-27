"use strict";

const levelCap = 55;
let skills = [];
let combatSkills = [];
const selectedSkills = new Set();
const selectedCombatSkills = new Set();

let skillsGraph;
let combatSkillsGraph;
let currentlyHoveredNode;

async function loadSkills() {
    const skillsFile = await fetch('data/skills.json');
    skills = await skillsFile.json();

    const combatSkillsFile = await fetch('data/combatskills.json');
    combatSkills = await combatSkillsFile.json();

    createGraph(skills);
    createCombatGraph(combatSkills);

    loadSkillsFromURL();
}

function updateURL() {
    const skillArray = Array.from(selectedSkills);
    const combatArray = Array.from(selectedCombatSkills);

    const encodedSkills = encodeURIComponent(skillArray.join(','));
    const encodedCombatSkills = encodeURIComponent(combatArray.join(','));

    const params = new URLSearchParams();

    if (skillArray.length > 0) {
        params.set('skills', encodedSkills);    
    }

    if (combatArray.length > 0) {
        params.set('combat', encodedCombatSkills);
    }

    const newUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
}


function loadSkillsFromURL() {
    const urlParams = new URLSearchParams(window.location.search);

    const urlSkills = urlParams.get('skills');
    if (urlSkills) {
        const skillIds = decodeURIComponent(urlSkills).split(',');
        skillIds.forEach(id => selectedSkills.add(id));
    }

    const urlCombatSkills = urlParams.get('combat');
    if (urlCombatSkills) {
        const combatIds = decodeURIComponent(urlCombatSkills).split(',');
        combatIds.forEach(id => selectedCombatSkills.add(id));
    }

    skillsGraph.nodes().forEach(node => {
        if (selectedSkills.has(node.id())) {
            setSkillImage(node);
        }
    });

    combatSkillsGraph.nodes().forEach(node => {
        if (selectedCombatSkills.has(node.id())) {
            setCombatSkillImage(node)
        }
    });

    updateSkillLines();
    updateSkillEffects();
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
    selectedSkills.clear();
    selectedCombatSkills.clear();

    skillsGraph.nodes().forEach(node => {
        setSkillImage(node);
    });

    skillsGraph.edges().forEach(edge => {
        edge.style('line-color', '#888888');
    });

    combatSkillsGraph.nodes().forEach(node => {
        setSkillImage(node);
    });

    updateSkillEffects();
    updateURL();
}






// Skills

function createGraph(skills) {
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
            classes: skillType
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
                    'overlay-padding': '0px',
                    'background-opacity': 0,
                    'background-image': function(skill) {
                        return `images/skills/${skill.data('group')}-grey.png`;
                    },
                    'background-fit': 'cover'
                },
            },
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

        if (selectedSkills.has(skillId)) {
            if (canDeselect()) {
                selectedSkills.delete(skillId);
                setSkillImage(node);
            }
            else {
                return;
            }
        } 
        else {
            if (isSkillConnected(skill)){
                selectedSkills.add(skillId);
                setSkillImage(node);
            }
            else {
                return;
            }
        }

        updateSkillLines();
        updateSkillEffects();
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

    if (selectedSkills.has(node.id())) {
        node.style('background-image', `images/skills/${group}.png`);
    } 
    else {
        node.style('background-image', `images/skills/${group}-grey.png`);
    }
}

function isSkillConnected(skill) {
    if (selectedSkills.size == 0 & skill.core_skill) {
        return true;
    }

    const selectedSkillNeighbours = skill.connections;
    return selectedSkillNeighbours.some(neighbour => selectedSkills.has(neighbour));
}

function canDeselect(skill) {
    return true; // Need to make it so that people cant de-select skills that would cause "stranded" skills
}

function updateSkillLines() {
    skillsGraph.edges().forEach(edge => {
        const preexistingSkill = selectedSkills.has(edge.source().id());
        const newSkill = selectedSkills.has(edge.target().id());

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

    const mappedSelectedSkills = Array.from(selectedSkills).map(id => 
        skills.find(s => s.id === id)
    );

    // Count cores
    const coreSkills = mappedSelectedSkills.filter(s => s.core_skill);

    total += (coreSkills.length - 1) * 2;

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

function createCombatGraph(combatSkills) {
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
            if (selectedCombatSkills.has(conflictId)) {
                selectedCombatSkills.delete(conflictId);

                const conflictingSkill = combatSkillsGraph.getElementById(conflictId);
                if (conflictingSkill) {
                    setCombatSkillImage(conflictingSkill);
                }
            }
        });

        if (selectedCombatSkills.has(combatSkillId)) {
            selectedCombatSkills.delete(combatSkillId);
            setCombatSkillImage(node);
        } 
        else {
            selectedCombatSkills.add(combatSkillId);
            setCombatSkillImage(node);
        }

        updateSkillEffects();
        updateURL();
    });
}

function caclulateCombatSkillPoints() {
    let total = 0;

    total = selectedCombatSkills.size;

    return total;
}

function setCombatSkillImage(node) {
    const group = node.data('group');

    if (selectedCombatSkills.has(node.id())) {
        node.style('background-image', `images/combatSkills/${group}.png`);
    } 
    else {
        node.style('background-image', `images/combatSkills/${group}-grey.png`);
    }
}



//The actual important stuff

function updateSkillEffects() {
    
    let weight = 0;

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


    const coreSkillsSelected = [];

    selectedSkills.forEach(id => {
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
                sdCameraDetection += 5;
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

    selectedCombatSkills.forEach(id => {
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

    document.getElementById('health').innerText = (100 + vitMaxHealth).toString();
    document.getElementById('stamina').innerText = (100 + conMaxStamina).toString();
    document.getElementById('staminaRegenRate').innerText = (15 * (1.0 + conStamRegen) * (agility >= 2 ? 1.5 : 1)).toString();
    document.getElementById('dodgeChance').innerText = (lpDodgeRate + htCrouchedDodgeChance).toString(); // Need to consider weight at some point: Each point of weight beyond 12 reduces your dodge change by a multiplicative ~2.08%.
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

    let coreSkillMessage = "";
    if (coreSkillsSelected.length == 0) {
        coreSkillMessage = "You need to select at least one core skill!";
    }
    //document.getElementById('coreSkillWarning').innerText = coreSkillMessage;
}


loadSkills();
