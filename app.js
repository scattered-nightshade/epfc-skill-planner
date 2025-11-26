"use strict";

let skills = [];
let cy;
const selectedSkills = new Set();

async function loadSkills() {
    const response = await fetch('data/skills.json');
    skills = await response.json();
    createGraph(skills);
}

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
                label: skill.name 
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

    cy = cytoscape({
        container: document.getElementById('skill-web'),
        elements: elements,
        style: [
            { 
                selector: 'node', 
                style: { 
                    'label': 'data(label)',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'background-color': '#888888',
                    'color': 'black',
                    'overlay-padding': '0px'
                } 
            },
            { 
                selector: '.core', 
                style: { 
                    'background-color': '#ffaa00' 
                } 
            },
            { 
                selector: '.major', 
                style: { 
                    'background-color': '#0099ff' 
                } 
            },
            { 
                selector: '.minor', 
                style: { 
                    'background-color': '#00ffaa' 
                } 
            },
            { 
                selector: 'edge', 
                style: { 
                    'width': 4, 
                    'line-color': '#cccccc' 
                } 
            }
        ],
        layout: { name: 'preset' },
        autoungrabify: true,
        wheelSensitivity: 0.1,
        minZoom: 0.5,
        maxZoom: 5
    });


    addNodeClickHandler();

}

function addNodeClickHandler() {
    cy.on('tapstart', 'node', (event) => {
        const node = event.target;
        const skillId = node.id();
        const skill = skills.find(_skill => _skill.id == skillId);

        if (selectedSkills.has(skillId)) {
            if (canDeselect()) {
            selectedSkills.delete(skillId);
            node.style('border-width', 0);
        } 
        else {
                return;
            }
        } 
        else {
            if (isSkillConnected(skill)){
            selectedSkills.add(skillId);
            node.style('border-width', 4);
            node.style('border-color', 'white');
            }
            else {
                return;
            }
        }

        updateSkillEffects();
    });
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

function updateSkillEffects() {
    
    let weight = 0;

    let agility = 0;
    
    let conMaxStamina = 0;
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
                break
            case "con":
                conMaxStamina += 6;
                break
            case "agil":
                agility += 1;
                
            
        }
    });

    document.getElementById('stamina').innerText = (100 + conMaxStamina).toString();
    document.getElementById('staminaRegenRate').innerText = (15 * (1.0 + (0.03 * conMaxStamina)) * (agility >= 2 ? 1.5 : 1)).toString();
    document.getElementById('dodgeChance').innerText = lpDodgeRate.toString(); // Need to consider weight at some point: Each point of weight beyond 12 reduces your dodge change by a multiplicative ~2.08%.
    document.getElementById('critChance').innerText = ciCritRate.toString();
    document.getElementById('reloadSpeed').innerText = (100 + fhReloadSpeed).toString();
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
    document.getElementById('coreSkillWarning').innerText = coreSkillMessage;
}

loadSkills();
