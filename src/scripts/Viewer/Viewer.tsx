import * as Stats from 'stats.js';
import * as WEBIFC from 'web-ifc'

import { IFCModel } from './IFCModel';
import * as React from 'react';

import {Container, culler, world } from './Components';

import ToolBar from './Toolbar'
import ModelManager from '../Functions/ModelManager';
import PropertyTree from '../Functions/PropertyTree';
import Properties from '../Functions/Properties'; 
import SpatialStructure from '../Functions/SpatialStructure'
import Plans from '../Functions/Plans'
import Dockers from '../Utility/DockerUtility'

import '../Functions/TransformControls'
import '../Functions/Culler' 
//import '../Settings/CameraSettings'

declare global {
    var debug: Function;

    var onModelAdded: CustomEvent<IFCModel>;
    var onModelRemoved: CustomEvent<IFCModel>;

    var onViewportLoaded: CustomEvent;

    var webIFC: WEBIFC.IfcAPI;
}

global.webIFC = new WEBIFC.IfcAPI();
webIFC.SetWasmPath("https://unpkg.com/web-ifc@0.0.66/", true);
await webIFC.Init();

global.onViewportLoaded = new CustomEvent('onViewportLoaded');

const OnDebuggingEnabled = new CustomEvent('debugenabled');
const OnDebuggingDisabled = new CustomEvent('debugdisabled')
var isDebugging = false;

export var viewportRef: React.RefObject<HTMLDivElement>;
var isLoaded = false;

globalThis.debug = () => {
    isDebugging = !isDebugging;

    isDebugging ? document.dispatchEvent(OnDebuggingEnabled) : document.dispatchEvent(OnDebuggingDisabled)
}

export default function Viewport() {
    viewportRef = React.useRef<HTMLDivElement>(undefined)

    const modelManagerRef = React.useRef<HTMLDivElement>(undefined);

    const MoveViewport = (e: MouseEvent) => {
        viewportRef.current.style.top = `${viewportRef.current.offsetTop + e.movementY}px`;
        viewportRef.current.style.left = `${viewportRef.current.offsetLeft + e.movementX}px`;
    }
    
    const mounted = React.useRef(false);
    React.useEffect(()=>{
        if(!mounted.current) {
            mounted.current= true;
            
            const debugFrame = culler.renderer.domElement;
            document.body.appendChild(debugFrame);
            debugFrame.style.visibility = 'hidden';
            debugFrame.style.position = "fixed";
            debugFrame.style.left = "0";
            debugFrame.style.bottom = "0";

            const stats = new Stats();
            stats.showPanel(2);
            document.body.append(stats.dom);
            stats.dom.style.visibility = 'hidden';
            stats.dom.style.zIndex = "unset";
            stats.dom.style.right = '0px';
            stats.dom.style.bottom = '0px';
            stats.dom.style.top = 'unset';
            stats.dom.style.left = 'unset';
            world.renderer.onBeforeUpdate.add(() => stats.begin());
            world.renderer.onAfterUpdate.add(() => stats.end());

            document.addEventListener('debugenabled', () => {
                debugFrame.style.visibility = 'visible';
                stats.dom.style.visibility = 'visible';
            })

            document.addEventListener('debugdisabled', () => {
                debugFrame.style.visibility = 'hidden';
                stats.dom.style.visibility = 'hidden';
            })
        }
    }, []) 

    return (     
        <>
            <div ref={viewportRef} id='viewport'>
                <div 
                    id="viewport-label" 
                    className='unselectable' 
                    onMouseDown={(e) => { 
                        const label = e.target as HTMLElement;
                        document.addEventListener('mousemove', MoveViewport);
                        label.addEventListener('mouseup', ()=>{ 
                            document.removeEventListener('mousemove', MoveViewport)
                        }, {once: true}) 
                    }} 
                    >IFC Viewer
                </div>
                <Container></Container>
                <Dockers></Dockers>
                <ToolBar modelManagerRef={modelManagerRef}></ToolBar>
            </div>
            <ModelManager window={modelManagerRef}></ModelManager>
            <PropertyTree></PropertyTree>
            <Properties></Properties>
            <SpatialStructure></SpatialStructure>
            <Plans></Plans>
        </>
    );
}

/*
        

*/