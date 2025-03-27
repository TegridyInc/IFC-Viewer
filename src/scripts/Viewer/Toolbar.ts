import * as COM from '@thatopen/components'

import * as Components from './Components'
import * as IFCLoader from './IFCLoader'

const fileUpload = document.getElementById('ifc-file-upload') as HTMLInputElement;
const projection = document.getElementById('projection') as HTMLSelectElement;
const navigation = document.getElementById('navigation') as HTMLSelectElement;

const openCameraSettings = document.getElementById('open-camera-settings');
const cameraSettings = document.getElementById('camera-settings');

const toolSelection = document.getElementById('tool-selection') as HTMLElement;
const openToolSelection = document.getElementById('open-tool-selection') as HTMLElement;

const explode = document.getElementById('explode');

export const moveTool = document.getElementById('move')
export const selectTool = document.getElementById('select');
export const clipperTool = document.getElementById('clipper');

export enum Tools {
    Select,
    Move,
    Clipper
}

export var currentTool = Tools.Select;
export const onToolChanged = new CustomEvent('onToolChanged', { detail: currentTool })
var currentToolElement: HTMLElement;

Initialize();

function Initialize() {
    InitializeTools();

    fileUpload.addEventListener('input', () => {
        const file = fileUpload.files[0];
        if (!file)
            return;

        const reader = new FileReader();
        reader.onload = () => {
            const data = new Uint8Array(reader.result as ArrayBuffer);
            IFCLoader.LoadIFCModel(data, file.name.split(".ifc")[0]);
        }

        reader.readAsArrayBuffer(file);
    })

    projection.oninput = () => {
        switch (projection.value) {
            case "perspective":
                Components.world.camera.projection.set("Perspective");
                Components.grid.fade = true;
                break;
            case "orthographic":
                if (Components.world.camera.mode.id == 'FirstPerson') {
                    projection.value = 'perspective'
                    break;
                }

                Components.world.camera.projection.set("Orthographic");
                Components.grid.fade = false;
                break;
        }
    };

    navigation.oninput = () => {
        if (Components.world.camera.projection.current == 'Orthographic') {
            navigation.value = 'Orbit'
            return;
        }

        Components.world.camera.set(navigation.value as COM.NavModeID);
    };

    openCameraSettings.addEventListener('click', () => {
        cameraSettings.style.visibility = 'visible';
    })

    explode.addEventListener('click', () => {
        const explodeModel = explode.classList.toggle('small-button-selected')
        Components.exploder.set(explodeModel);

        Components.culler.needsUpdate = true;
    })
}

function InitializeTools() {
    currentToolElement = selectTool;

    moveTool.addEventListener('click', () => SelectTool(Tools.Move, moveTool))

    selectTool.addEventListener('click', () => {
        SelectTool(Tools.Select, selectTool)
    })

    clipperTool.addEventListener('click', () => {
        SelectTool(Tools.Clipper, clipperTool)
    })

    openToolSelection.onclick = () => {
        if (openToolSelection.classList.contains('tool-disabled'))
            return;

        toolSelection.style.visibility = 'visible'
    }
    toolSelection.style.visibility = 'hidden';
}

function SelectTool(newTool: Tools, toolElement: HTMLElement) {
    currentToolElement.classList.remove('tool-selected')
    currentToolElement = toolElement;
    currentToolElement.classList.add('tool-selected')

    DeactivateTool();
    currentTool = newTool;
    document.dispatchEvent(onToolChanged)
    ActivateTool();

    openToolSelection.title = toolElement.title
    openToolSelection.innerHTML = toolElement.innerHTML;
    toolSelection.style.visibility = 'hidden'
}

export function DeactivateTool() {
    switch (currentTool) {
        case Tools.Select:
            Components.highlighter.clear();
            Components.highlighter.enabled = false;
            break;
        case Tools.Move:
            break;
        case Tools.Clipper:
            Components.clipper.deleteAll();
            Components.clipper.enabled = false;
            break;
    }
}

export function ActivateTool() {
    switch (currentTool) {
        case Tools.Select:
            Components.highlighter.enabled = true;
            break;
        case Tools.Move:

            break;
        case Tools.Clipper:
            Components.clipper.enabled = true;
            break;
    }
}

export function DisableTool() {
    toolSelection.style.visibility = 'hidden'
    openToolSelection.classList.add('tool-disabled')
}

export function EnableTool() {
    openToolSelection.classList.remove('tool-disabled')
}
