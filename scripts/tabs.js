"use strict";

const hiddenClass = 'hidden';

const skillsContainer = document.getElementById('skillsContainer');
const combatSkillsContainer = document.getElementById('combatSkillsContainer');
const inventoryContainer = document.getElementById('inventoryContainer');
const helpContainer = document.getElementById('helpContainer');

function switchTab(containerId) {
    skillsContainer.classList.add(hiddenClass);
    combatSkillsContainer.classList.add(hiddenClass);
    inventoryContainer.classList.add(hiddenClass);
    helpContainer.classList.add(hiddenClass);

    document.getElementById(containerId).classList.remove(hiddenClass);
}


const weaponsContainer = document.getElementById('weaponsItemList');
const weaponmodsContainer = document.getElementById('weaponmodsItemList');
const toolsContainer = document.getElementById('toolsItemList');
const combatContainer = document.getElementById('combatItemList');
const concealedContainer = document.getElementById('concealedItemList');
const armourContainer = document.getElementById('armourItemList');

function switchInventoryTab(containerId) {
    weaponsContainer.classList.add(hiddenClass);
    weaponmodsContainer.classList.add(hiddenClass);
    toolsContainer.classList.add(hiddenClass);
    combatContainer.classList.add(hiddenClass);
    concealedContainer.classList.add(hiddenClass);
    armourContainer.classList.add(hiddenClass);

    document.getElementById(containerId).classList.remove(hiddenClass);
}