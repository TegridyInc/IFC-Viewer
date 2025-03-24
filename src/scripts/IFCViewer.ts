import * as Stats from 'stats.js';
import * as WEBIFC from 'web-ifc'
import * as FBX from 'three/examples/jsm/loaders/FBXLoader';
import * as THREE from 'three';
import * as FRA from '@thatopen/fragments'

import * as Components from './Components';
import * as IFCLoader from './IFCLoader'
import * as UIUtility from './UIUtility'
import * as IFCUtility from './IFCUtility'
import * as Toolbars from './Toolbars'

//#region Debugging
declare global {
    var debug: Function;
}

const OnDebuggingEnabled = new CustomEvent('debugenabled');
const OnDebuggingDisabled = new CustomEvent('debugdisabled')
var isDebugging = false;

globalThis.debug = () => {
    isDebugging = !isDebugging;

    isDebugging ? document.dispatchEvent(OnDebuggingEnabled) : document.dispatchEvent(OnDebuggingDisabled)
}
//#endregion

export const viewport = document.getElementById('viewport');
export const viewportLabel = document.getElementById('viewport-label')
export const container = document.getElementById('container');
export var modelManagerContainer: HTMLElement;

export var propertyTree: HTMLElement
export var propertyTreeContainer: HTMLElement;

export var propertiesContainer: HTMLElement;

export const webIfc = new WEBIFC.IfcAPI();
export const cameraFitting = {
    cover: false,
    paddingLeft: 5,
    paddingRight: 5,
    paddingBottom: 5,
    paddingTop: 5,
};

export var transformControls: THREE.Group;
export var selectedModel: THREE.Object3D;
export var boundingBoxes = [] as IFCUtility.BoundingBoxData[];

var upControl: THREE.Mesh;
var leftControl: THREE.Mesh;
var forwardControl: THREE.Mesh;
var mouseMoveAmount = 0;

Initialize();

async function Initialize(): Promise<void> {
    webIfc.SetWasmPath("https://unpkg.com/web-ifc@0.0.66/", true);
    await webIfc.Init();
    IFCUtility.Setup(webIfc);

    Components.Initialize();
    Toolbars.Initialize();

    Components.world.camera.controls.addEventListener('control', ScaleTransformControls)

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

    UIUtility.RegisterWindows();

    UIUtility.RegisterSlider(document.getElementById('culler-threshold'), (value) => {
        Components.culler.config.threshold = value;
        Components.culler.needsUpdate = true;
    })

    selectedModel = null;
    InitializeWindows();
    InitializeTransformControls();
    InitializeDebugging();

    function InitializeTransformControls() {
        container.addEventListener('mousedown', () => {
            mouseMoveAmount = 0;
            document.addEventListener('mousemove', CalculateMouseMoveAmount)
        })

        container.addEventListener('mouseup', () => {
            document.removeEventListener('mousemove', CalculateMouseMoveAmount)
        })

        function CalculateMouseMoveAmount(e: MouseEvent) {
            mouseMoveAmount += e.movementX;
            mouseMoveAmount += e.movementY;
        }

        const fbxLoader = new FBX.FBXLoader();
        fbxLoader.load('./Assets/Transform Controls.fbx', (model) => {
            model.children.forEach(child => {
                const mesh = child as THREE.Mesh;
                if (mesh) {
                    const material = mesh.material as THREE.MeshPhongMaterial;
                    mesh.material = new THREE.MeshBasicMaterial({ depthFunc: THREE.AlwaysDepth, color: material.color });
                }

                if (mesh.name == 'UP')
                    upControl = mesh;
                else if (mesh.name == 'LEFT')
                    leftControl = mesh;
                else if (mesh.name == 'FORWARD')
                    forwardControl = mesh;
            })

            Components.world.scene.three.add(model)
            model.visible = false;
            transformControls = model;
        });

        //Transform Controls
        container.addEventListener('mousedown', () => {
            const result = Components.caster.castRay([upControl, leftControl, forwardControl]);
            if (!result)
                return;

            Components.world.camera.controls.enabled = false;
            var axis = new THREE.Vector3();
            if (result.object == upControl)
                axis.set(0, 1, 0);
            else if (result.object == leftControl)
                axis.set(1, 0, 0)
            else
                axis.set(0, 0, 1)

            document.addEventListener('mousemove', MoveModel)

            document.addEventListener('mouseup', () => {
                Components.world.camera.controls.enabled = true;
                document.removeEventListener('mousemove', MoveModel)

                if (!selectedModel)
                    return;

                selectedModel.updateWorldMatrix(false, true);
                for (const child of selectedModel.children) {
                    const colorMesh = Components.culler.colorMeshes.get(child.uuid)
                    if (colorMesh != undefined) {
                        colorMesh.position.setScalar(0);

                        //colorMesh.setMatrixAt(0, new THREE.Matrix4())
                        colorMesh.applyMatrix4(child.matrixWorld)
                        colorMesh.updateMatrix();
                    }
                }
                Components.culler.needsUpdate = true;
            }, { once: true })

            function MoveModel(e: MouseEvent) {
                var forward = new THREE.Vector3();
                Components.world.camera.three.getWorldDirection(forward)

                const yaw = Components.world.camera.three.rotation.z;

                const left = new THREE.Vector3();
                left.x = -Math.cos(yaw);
                left.y = 0;
                left.z = Math.sin(yaw);

                const up = forward.clone().cross(left);

                const distance = Components.world.camera.projection.current == 'Perspective' ? result.distance : (45 / Components.world.camera.threeOrtho.zoom);
                const mouseMovement = new THREE.Vector2(e.movementX * .002 * distance, e.movementY * .002 * distance);

                const offsetX = left.x * -mouseMovement.x + (up.x * -mouseMovement.y * (forward.y > 0 ? -1 : 1));
                const offsetY = Math.abs(up.y) * -mouseMovement.y;
                const offsetZ = up.z * -mouseMovement.y + (left.z * -mouseMovement.x * (forward.y > 0 ? -1 : 1));
                const offset = axis.clone().multiply(new THREE.Vector3(offsetX, offsetY, offsetZ))
                transformControls.position.add(offset)

                selectedModel?.position.copy(transformControls.position);
            }
        })

        //Bounding Boxes
        container.addEventListener('mouseup', (e) => {
            if (e.button != 0 || mouseMoveAmount != 0)
                return;

            if (Toolbars.currentTool == Toolbars.Tools.Move) {
                ClearSelection();

                const geometries = [] as THREE.Mesh[]
                boundingBoxes.forEach(boundingBox => {
                    geometries.push(boundingBox.boxMesh);
                })

                const result = Components.caster.castRay(geometries);
                if (!result)
                    return;

                const outline = boundingBoxes.find(value => value.boxMesh == result.object).outline;

                outline.visible = true;
                transformControls.visible = true;
                transformControls.position.copy(outline.parent.position);
                selectedModel = outline.parent;
                Toolbars.CreateSpatialStructure(selectedModel.userData.modelID);
            }
        })
    }


    function InitializeWindows() {
        const modelManagerWindow = UIUtility.CreateWindow('Model Manager', document.body);
        modelManagerContainer = modelManagerWindow[1];
        const openModelManager = document.getElementById('open-model-manager')
        openModelManager.addEventListener('click', () => {
            if (modelManagerWindow[1].parentElement == modelManagerWindow[0])
                modelManagerWindow[0].style.visibility = 'visible'
        })

        const propertiesWindow = UIUtility.CreateWindow('Properties', document.body);
        propertiesContainer = propertiesWindow[1];
        const openProperties = document.getElementById('open-properties')
        openProperties.addEventListener('click', () => {
            if (propertiesWindow[1].parentElement == propertiesWindow[0])
                propertiesWindow[0].style.visibility = 'visible'
        })

        Components.highlighter.events.select.onHighlight.add(CreateProperties)

        const propertyTreeWindow = UIUtility.CreateWindow('Property Tree', document.body);
        propertyTree = propertyTreeWindow[0];
        propertyTreeContainer = propertyTreeWindow[1];
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

export function ScaleTransformControls() {
    if (Components.world.camera.projection.current == 'Orthographic') {
        transformControls.scale.setScalar(45 / Components.world.camera.threeOrtho.zoom);
    } else {
        var distance = transformControls.position.distanceTo(Components.world.camera.three.position);
        transformControls.scale.setScalar(distance + 2);
    }
}

export function ClearSelection() {
    selectedModel = null;
    transformControls.visible = false;

    boundingBoxes.forEach(boundingBox => {
        boundingBox.outline.visible = false;
    })
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