"use strict";

let skills = [];
let cy;
const selectedSkills = new Set();

async function loadSkills() {
    const response = await fetch('skills.json');
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
        autoungrabify: true
    });


    addNodeClickHandler();

}

function addNodeClickHandler() {
    cy.on('tap', 'node', (evt) => {
        const node = evt.target;
        const skillId = node.id();

        if (selectedSkills.has(skillId)) {
            selectedSkills.delete(skillId);
            node.style('border-width', 0);
        } else {
            selectedSkills.add(skillId);
            node.style('border-width', 4);
            node.style('border-color', 'white');
        }

        updateSkillEffects();
    });
}

//Works fine when youre adding skills but everything gets fucked up when trying to remove a skill, will need to look into that
function updateSkillEffects() {
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

        if (!skill.major_skill) {
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
                
            }
        }

        document.getElementById('conValue').innerText = formatSkillString(conMaxStamina);
        document.getElementById('afValue').innerText = formatSkillString(afDrillSpeed);
        document.getElementById('fhLockpickingValue').innerText = formatSkillString(fhLockpickSpeed);
        document.getElementById('fhReloadSpeedValue').innerText = formatSkillString(fhReloadSpeed);
        document.getElementById('masValue').innerText = formatSkillString(masDisguiseDetectionSpeed);
        document.getElementById('disValue').innerText = formatSkillString(disSuspiciousDetectionSpeed);
        document.getElementById('lpDetectionValue').innerText = formatSkillString(lpDetectionSpeed);
        document.getElementById('lpDodgeValue').innerText = formatSkillString(lpDodgeRate);
        document.getElementById('eaSpeedValue').innerText = formatSkillString(eaHackSpeed);
        document.getElementById('ciCritValue').innerText = formatSkillString(ciCritRate);
        document.getElementById('ciResourceValue').innerText = formatSkillString(ciHackResourceCost);
        document.getElementById('teValue').innerText = formatSkillString(teTechItems);
        document.getElementById('sdValue').innerText = formatSkillString(sdCameraDetection);

    });

    let coreSkillMessage = "";
    if (coreSkillsSelected.length == 0) {
        coreSkillMessage = "You need to select at least one core skill!";
    }
    document.getElementById('coreSkillWarning').innerText = coreSkillMessage;
}

function formatSkillString(value) {
    let newString = "";
    if (value >= 0) {
        newString = "+" + value.toString() + "%";
    }
    else {
        newString = value.toString() + "%";
    }
    return newString;
}

loadSkills();
