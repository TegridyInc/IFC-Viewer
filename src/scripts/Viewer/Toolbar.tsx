import * as COM from '@thatopen/components'
import * as Components from './Components'
import * as IFCLoader from './IFCLoader'
import {Button} from '../Utility/UIUtility'

import * as React from 'react';

var fileUpload: HTMLInputElement;
var projection: HTMLSelectElement;
var navigation: HTMLSelectElement;

var openCameraSettings: HTMLElement;
var cameraSettings: HTMLElement;

var toolSelection: HTMLElement;
var openToolSelection: HTMLElement;

var explode: HTMLElement;

export enum Tools {
    Select,
    Move,
    Clipper
}

var currentTool = Tools.Select;
var onToolChanged = new CustomEvent('onToolChanged', { detail: currentTool })
var currentToolElement: HTMLElement;


// projection.oninput = () => {
//     switch (projection.value) {
//         case "perspective":
//             Components.world.camera.projection.set("Perspective");
//             Components.grid.fade = true;
//             break;
//         case "orthographic":
//             if (Components.world.camera.mode.id == 'FirstPerson') {
//                 projection.value = 'perspective'
//                 break;
//             }

//             Components.world.camera.projection.set("Orthographic");
//             Components.grid.fade = false;
//             break;
//     }
// };

// navigation.oninput = () => {
//     if (Components.world.camera.projection.current == 'Orthographic') {
//         navigation.value = 'Orbit'
//         return;
//     }

//     Components.world.camera.set(navigation.value as COM.NavModeID);
// };

// openCameraSettings.addEventListener('click', () => {
//     cameraSettings.style.visibility = 'visible';
// })



export default function Toolbar(props: { modelManagerRef: React.RefObject<HTMLDivElement> }) {
    const toolSelectionRef = React.useRef<HTMLDivElement>(undefined);
    const selectToolRef = React.useRef<HTMLDivElement>(undefined);

    const mounted = React.useRef(false)
    React.useEffect(()=>{
        if(!mounted.current) {
            mounted.current = true;

            selectToolRef.current.classList.add('tool-selected');
            currentToolElement = selectToolRef.current;

            fileUpload = document.getElementById('ifc-file-upload') as HTMLInputElement;
            projection = document.getElementById('projection') as HTMLSelectElement;
            navigation = document.getElementById('navigation') as HTMLSelectElement;

            openCameraSettings = document.getElementById('open-camera-settings');
            cameraSettings = document.getElementById('camera-settings');

            toolSelection = document.getElementById('tool-selection');
            openToolSelection = document.getElementById('open-tool-selection');

            explode = document.getElementById('explode');

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

            explode.addEventListener('click', () => {
                const explodeModel = explode.classList.toggle('small-button-selected')
                Components.exploder.set(explodeModel);

                Components.culler.needsUpdate = true;
            })
        }
    }, [])

    return (
        <div id='viewport-controls'>
            <Button icon='menu' onClick={() => { props.modelManagerRef.current.style.visibility = 'visible' }}></Button>
            <Button icon='videocam'></Button>
            <label className="small-button unselectable material-symbols-outlined" htmlFor="ifc-file-upload" title="Upload IFC Model">
                upload_file
                <input type="file" id="ifc-file-upload" accept=".ifc" hidden />
            </label>
            <Button id='open-spatial-structure' icon='package_2'></Button>
            <Button id='explode' icon='explosion'></Button>
            <div>
                <Button icon='arrow_selector_tool' id='open-tool-selection' onClick={()=>{ toolSelectionRef.current.style.visibility = 'visible' }}></Button>
                <div id='tool-selection' ref={toolSelectionRef}>
                    <Button id='0' icon='arrow_selector_tool' onClick={SelectTool} ref={selectToolRef}></Button>
                    <Button id='1' icon='open_with' onClick={SelectTool}></Button>
                    <Button id='2' icon='start' onClick={SelectTool}></Button>
                </div>
            </div>
            <Button id='open-properties' icon='data_object'></Button>
        </div>
    );
}

function SelectTool(event: React.MouseEvent) {
    const toolElement = event.target as HTMLElement;

    currentToolElement.classList.remove('tool-selected')
    currentToolElement = toolElement;
    currentToolElement.classList.add('tool-selected')
    
    DeactivateTool();
    
    const toolIndex = parseInt(toolElement.id);
    currentTool = toolIndex;
    onToolChanged = new CustomEvent('onToolChanged', {detail:toolIndex})
    document.dispatchEvent(onToolChanged)

    ActivateTool();

    currentToolElement = toolElement;

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

/*
export function DisableTool() {
    toolSelection.style.visibility = 'hidden'
    openToolSelection.classList.add('tool-disabled')
}

export function EnableTool() {
    openToolSelection.classList.remove('tool-disabled')
}
*/


