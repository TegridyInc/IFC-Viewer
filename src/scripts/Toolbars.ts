import * as FRA from '@thatopen/fragments'
import * as COM from '@thatopen/components'

import * as IFCViewer from './IFCViewer'
import * as Components from './Components'
import * as IFCLoader from './IFCLoader';
import * as UIUtility from './UIUtility';

const fileUpload = document.getElementById('ifc-file-upload') as HTMLInputElement;
const projection = document.getElementById('projection') as HTMLSelectElement;
const navigation = document.getElementById('navigation') as HTMLSelectElement;

const openCameraSettings = document.getElementById('open-camera-settings');
const cameraSettings = document.getElementById('camera-settings');

const toolSelection = document.getElementById('tool-selection') as HTMLElement;
const openToolSelection = document.getElementById('open-tool-selection') as HTMLElement;

const openSpatialStructure = document.getElementById('open-spatial-structure')
const spatialStructure = document.getElementById('spatial-structure')
const spatialStructureContainer  = spatialStructure.getElementsByClassName('window-container').item(0) as HTMLElement;

export const moveTool = document.getElementById('move')
export const selectTool = document.getElementById('select');

export enum Tools {
    Select,
    Move,
}
export var currentTool: Tools;

export function Initialize() {
    moveTool.addEventListener('click', () => {
        currentTool = Tools.Move
        moveTool.classList.add('tool-selected')
        selectTool.classList.remove('tool-selected')
        Components.highlighter.clear();
        Components.highlighter.enabled = false;
        toolSelection.style.visibility = 'hidden';
        openToolSelection.innerHTML = moveTool.innerHTML;
    })

    selectTool.addEventListener('click', () => {
        currentTool = Tools.Select
        selectTool.classList.add('tool-selected')
        moveTool.classList.remove('tool-selected')
        Components.highlighter.enabled = true;
        IFCViewer.transformControls.visible = false;
        IFCViewer.ClearSelection();
        toolSelection.style.visibility = 'hidden';
        openToolSelection.innerHTML = selectTool.innerHTML;
    })

    openToolSelection.onclick = () => {
        toolSelection.style.visibility = 'visible'
    }
    toolSelection.style.visibility = 'hidden';

    document.addEventListener('keydown', (e) => {
        if (e.key == 'f') {
            if (!IFCViewer.selectedModel)
                return;

            Components.boundingBoxer.dispose();
            Components.boundingBoxer.reset();
            Components.boundingBoxer.add(IFCViewer.selectedModel as FRA.FragmentsGroup);

            const box3 = Components.boundingBoxer.get();
            Components.world.camera.controls.fitToBox(box3, true, IFCViewer.cameraFitting).then(IFCViewer.ScaleTransformControls);
        }
    })



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

    openSpatialStructure.addEventListener('click', ()=>{
        spatialStructure.style.visibility = 'visible'
    })
}

export async function CreateSpatialStructure(modelID:number) {
    spatialStructureContainer.innerHTML = '';
    const spatialStructure = await IFCViewer.webIfc.properties.getSpatialStructure(modelID, true);
    const ifcProject = await IFCViewer.webIfc.properties.getItemProperties(modelID, spatialStructure.expressID);

    const foldout = UIUtility.CreateFoldout(ifcProject.Name.value, spatialStructureContainer)
    const label = document.createElement('div');
    label.innerHTML = `(${spatialStructure.type})`;
    label.style.paddingLeft = '5px'
    foldout.header.append(label);

    spatialStructure.children.forEach(async child => { 
        await CreateSpatialStructureElement(child, foldout.container)
    })
}

async function CreateSpatialStructureElement(element:any, parent:HTMLElement) {
    if(element.children.length > 0) {
        const foldout = UIUtility.CreateFoldout(element.Name ? element.Name.value : '', parent)
        
        const label = document.createElement('div');
        label.innerHTML = `(${element.type})`;
        if(element.Name.value != '')
            label.style.paddingLeft = '5px'
        foldout.header.append(label);

        for (const child of element.children) {
            CreateSpatialStructureElement(child, foldout.container);
        }
    } else {
        UIUtility.CreateFoldoutElement(element.Name.value + ` (${element.type})`, undefined, parent)
    }
}