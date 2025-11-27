"use strict";

const skillsContainer = document.getElementById('skillsContainer');
const combatSkillsContainer = document.getElementById('combatSkillsContainer');
const inventoryContainer = document.getElementById('inventoryContainer');
const helpContainer = document.getElementById('helpContainer');

function switchTab(containerId) {
    skillsContainer.classList.add('hidden');
    combatSkillsContainer.classList.add('hidden');
    inventoryContainer.classList.add('hidden');
    helpContainer.classList.add('hidden');

    document.getElementById(containerId).classList.remove('hidden');
}