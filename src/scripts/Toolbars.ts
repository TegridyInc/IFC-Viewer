import * as FRA from '@thatopen/fragments'
import * as COM from '@thatopen/components'

import * as IFCViewer from './IFCViewer'
import * as Components from './Components'
import * as IFCLoader from './IFCLoader';

const appHeader = document.getElementById('app-header')
const appHeaderHider = document.getElementById('app-header-hider');
const fileUpload = document.getElementById('ifc-file-upload') as HTMLInputElement;
const projection = document.getElementById('projection') as HTMLSelectElement;
const navigation = document.getElementById('navigation') as HTMLSelectElement;

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
    })
    
    selectTool.addEventListener('click', () => {
        currentTool = Tools.Select
        selectTool.classList.add('tool-selected')
        moveTool.classList.remove('tool-selected')
        Components.highlighter.enabled = true;
        IFCViewer.transformControls.visible = false;
        IFCViewer.ClearSelection();
    })
    
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

    appHeaderHider.onclick = () => {
        const isOpen = !appHeaderHider.classList.toggle('app-header-hider-closed');
        appHeader.style.height = isOpen ? '100px' : '0px';
    };
    
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
}