import * as Stats from 'stats.js';
import * as WEBIFC from 'web-ifc'
import * as THREE from 'three';
import * as FRA from '@thatopen/fragments'

import * as Components from './Components';
import * as IFCLoader from './IFCLoader'
import * as UIUtility from './UIUtility'
import * as IFCUtility from './IFCUtility'
import * as Toolbars from './Toolbars'
import './ModelManager'
import './PropertyTree'
import './TransformControls'
import './Plans'

declare global {
    interface ModelDispatcher {
        propertyTree: {}
        visible: { isVisible: boolean }
        plans: {}
    }

    interface WindowData {
        root: HTMLElement;
        container: HTMLElement;
    }

    var debug: Function;

    var onModelAdded: CustomEvent;
    var onModelRemoved: CustomEvent;

    var plans: WindowData;

    var propertyTree: WindowData;

    var selectedModel: THREE.Object3D;

    var container: HTMLElement;
    var webIFC: WEBIFC.IfcAPI;
}

globalThis.webIFC = new WEBIFC.IfcAPI();
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

export var propertiesContainer: HTMLElement;

export const cameraFitting = {
    cover: false,
    paddingLeft: 5,
    paddingRight: 5,
    paddingBottom: 5,
    paddingTop: 5,
};

Initialize();

async function Initialize(): Promise<void> {
    webIFC.SetWasmPath("https://unpkg.com/web-ifc@0.0.66/", true);
    await webIFC.Init();

    Toolbars.Initialize();

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

    //UIUtility.RegisterWindows();

    UIUtility.RegisterSlider(document.getElementById('culler-threshold'), (value) => {
        Components.culler.config.threshold = value;
        Components.culler.needsUpdate = true;
    })

    globalThis.selectedModel = null;
    InitializeWindows();
    InitializeDebugging();

    function InitializeWindows() {
        const propertiesWindow = UIUtility.CreateWindow('Properties', document.body);
        propertiesContainer = propertiesWindow[1];
        const openProperties = document.getElementById('open-properties')
        openProperties.addEventListener('click', () => {
            if (propertiesWindow[1].parentElement == propertiesWindow[0])
                propertiesWindow[0].style.visibility = 'visible'
        })

        Components.highlighter.events.select.onHighlight.add(CreateProperties)
    }

    function InitializeDebugging() {
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
    }
}

async function CreateProperties(fragmentIDMap: FRA.FragmentIdMap) {
    const sceneObjects = Components.world.scene.three.children;
    propertiesContainer.innerHTML = '';

    var idsFound = []
    for (const fragmentIDs in fragmentIDMap) {
        var modelID = -1;

        sceneObjects.forEach((object) => {
            if (!(object instanceof FRA.FragmentsGroup))
                return;
            object.children.forEach(child => {
                if (child.uuid == fragmentIDs) {
                    modelID = object.userData.modelID;
                    return;
                }
            })
        })

        if (modelID == -1)
            continue;

        for (const fragmentID of fragmentIDMap[fragmentIDs]) {
            const value = idsFound.find(value => {
                if (value.modelID == modelID) {
                    if (value.fragmentID == fragmentID)
                        return true;
                }
            })

            if (value != undefined)
                continue;

            idsFound.push({ modelID: modelID, fragmentID: fragmentID })
            await IFCUtility.CreateProperties(modelID, fragmentID)
        }

    }
}