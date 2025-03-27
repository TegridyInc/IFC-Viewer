import * as Stats from 'stats.js';
import * as WEBIFC from 'web-ifc'

import { IFCModel } from './IFCModel';
import * as Components from './Components';
import '../Functions/ModelManager'
import '../Functions/PropertyTree'
import '../Functions/Properties'
import '../Functions/TransformControls'
import '../Functions/Plans'
import '../Functions/Culler'
import '../Functions/SpatialStructure'
import '../Settings/CameraSettings'

declare global {
    var debug: Function;

    var onModelAdded: CustomEvent<IFCModel>;
    var onModelRemoved: CustomEvent<IFCModel>;

    var container: HTMLElement;
    var webIFC: WEBIFC.IfcAPI;
}

globalThis.webIFC = new WEBIFC.IfcAPI();
webIFC.SetWasmPath("https://unpkg.com/web-ifc@0.0.66/", true);
await webIFC.Init();

const OnDebuggingEnabled = new CustomEvent('debugenabled');
const OnDebuggingDisabled = new CustomEvent('debugdisabled')
var isDebugging = false;

globalThis.debug = () => {
    isDebugging = !isDebugging;

    isDebugging ? document.dispatchEvent(OnDebuggingEnabled) : document.dispatchEvent(OnDebuggingDisabled)
}

export const viewport = document.getElementById('viewport');
export const viewportLabel = document.getElementById('viewport-label')
globalThis.container = document.getElementById('container');

const MoveViewport = (e: MouseEvent) => {
    viewport.style.top = `${viewport.offsetTop + e.movementY}px`;
    viewport.style.left = `${viewport.offsetLeft + e.movementX}px`;
}
viewportLabel.addEventListener('mousedown', () => {
    document.addEventListener('mousemove', MoveViewport);
    viewportLabel.addEventListener('mouseup', () => {
        document.removeEventListener('mousemove', MoveViewport)
    }, { once: true })
})

const debugFrame = Components.culler.renderer.domElement;
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
Components.world.renderer.onBeforeUpdate.add(() => stats.begin());
Components.world.renderer.onAfterUpdate.add(() => stats.end());

document.addEventListener('debugenabled', () => {
    debugFrame.style.visibility = 'visible';
    stats.dom.style.visibility = 'visible';
})

document.addEventListener('debugdisabled', () => {
    debugFrame.style.visibility = 'hidden';
    stats.dom.style.visibility = 'hidden';
})