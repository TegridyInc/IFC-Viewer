import * as Components from './Components'
import * as IFCLoader from './IFCLoader'
import { styled, Stack, Divider, ToggleButtonGroup, Tooltip } from '@mui/material';
import {IconButton, ToggleButton} from '../Utility/UIUtility.component'
import * as React from 'react';

var fileUpload: HTMLInputElement;
var projection: HTMLSelectElement;
var navigation: HTMLSelectElement;

var openCameraSettings: HTMLElement;
var cameraSettings: HTMLElement;

var toolSelection: HTMLElement;
var openToolSelection: HTMLElement;

export enum Tools {
    Select,
    Move,
    Clipper
}

export var toolEnabled = true;
var currentTool = Tools.Select;
var onToolChanged = new CustomEvent('onToolChanged', { detail: currentTool })

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

const ViewportControls = styled(Stack)({
    display: 'flex',
    flexDirection: 'row',
    position: 'absolute',
    bottom: '10px',
    left: '50%',
    transform: 'translateX(-50%)',
    border: '1px solid var(--highlight-color)',
    borderRadius: '5px',
    backgroundColor: 'var(--secondary-color)',
    padding: '5px',
})

const ToolbarDivider = styled(Divider)({
    backgroundColor: '#333333',
    width: '1px',
    height: 'auto'
})

const ToolSelection = styled(ToggleButtonGroup)({
    display: 'flex',
    visibility: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    bottom: '40px',
    position: 'absolute',
    zIndex: '-10',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'var(--secondary-color)',
    border: '1px solid var(--highlight-color)',
    padding: '2px'
})

export default function Toolbar() {
    const toolSelectionRef = React.useRef<HTMLDivElement>(undefined);

    const [tool, setTool] = React.useState(0)

    const mounted = React.useRef(false)
    React.useEffect(()=>{
        if(!mounted.current) {
            mounted.current = true;

            fileUpload = document.getElementById('ifc-file-upload') as HTMLInputElement;
            projection = document.getElementById('projection') as HTMLSelectElement;
            navigation = document.getElementById('navigation') as HTMLSelectElement;

            openCameraSettings = document.getElementById('open-camera-settings');
            cameraSettings = document.getElementById('camera-settings');

            toolSelection = document.getElementById('tool-selection');
            openToolSelection = document.getElementById('open-tool-selection');

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
        }
    }, [])

    const [exploded, setExploded] = React.useState(false);
    const explodeModel = ()=>{
        setExploded((oldValue)=> !oldValue)
        Components.exploder.set(!exploded);

        Components.culler.needsUpdate = true;
    }

    const changeTool = (e: React.MouseEvent<HTMLElement>, v: number) => {
        if(v == null)
            return;

        setTool(v)
        const toolElement = e.target as HTMLElement;
     
        if(currentTool == v)
            return;

        if(toolEnabled)
            DeactivateTool();
       
        currentTool = v;
        onToolChanged = new CustomEvent('onToolChanged', {detail:v})
        document.dispatchEvent(onToolChanged)
    
        if(toolEnabled)
            ActivateTool();
        
        openToolSelection.innerHTML = toolElement.innerHTML;
        toolSelection.style.visibility = 'hidden'
    }

    return (
        <ViewportControls id='viewport-controls' direction={'row'} spacing={.5} divider={<ToolbarDivider orientation='vertical'/>}>
            <Tooltip title={'Model Manager'}>
                <IconButton id='open-model-manager'>menu</IconButton>
            </Tooltip>
            <Tooltip title={'Settings'}>
                <IconButton id='open-settings'>settings</IconButton>
            </Tooltip>
            <Tooltip title={'Upload IFC'}>
                <IconButton>
                    upload_file
                    <label style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'}}>
                        <input type="file" id="ifc-file-upload" accept=".ifc" hidden />
                    </label>
                </IconButton>
            </Tooltip>
            <Tooltip title={'Explode Models'}>
                <ToggleButton value={exploded} selected={exploded} id='explode' onClick={explodeModel}>explosion</ToggleButton>
            </Tooltip>
            <div style={{position: 'relative'}} id='tools'>
                <Tooltip title={'Select Tool'}>
                    <IconButton sx={{border: '1px solid rgba(0, 0, 0, 0.12)'}} id='open-tool-selection' onClick={()=>{ toolSelectionRef.current.style.visibility = 'visible' }}>arrow_selector_tool</IconButton>
                </Tooltip>
                <ToolSelection id='tool-selection' ref={toolSelectionRef} value={tool} exclusive onChange={changeTool}>
                    <Tooltip title={'Highlighter'}>
                        <ToggleButton color='primary' size='small' value={0} className='unselectable'>arrow_selector_tool</ToggleButton>
                    </Tooltip>
                    <Tooltip title={'Move'}>
                        <ToggleButton color='primary' size='small' value={1} className='unselectable'>open_with</ToggleButton>
                    </Tooltip>
                    <Tooltip title={'Clipper'}>
                        <ToggleButton color='primary' size='small' value={2} className='unselectable'>start</ToggleButton>
                    </Tooltip>
                </ToolSelection>
            </div>
            <Tooltip title={'IFC Properties'}>
                <IconButton id='open-properties'>data_object</IconButton>
            </Tooltip>
        </ViewportControls>
    );
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
    DeactivateTool();
    toolEnabled = false;
}

export function EnableTool() {
    ActivateTool();
    toolEnabled = true;
}




