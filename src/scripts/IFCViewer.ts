import * as Stats from 'stats.js';
import * as COM from '@thatopen/components';
import * as OBF from '@thatopen/components-front';
import * as FRA from '@thatopen/fragments';
import * as UI from '@thatopen/ui';
import * as CUI from '@thatopen/ui-obc'
import * as WEBIFC from 'web-ifc'
import * as FBX from 'three/examples/jsm/loaders/FBXLoader';
import * as EXCELJS from 'exceljs'
import * as THREE from 'three';
import * as UIUtility from './UIUtility'
import * as IFCUtility from './IFCUtility'
//#region Debugging
declare global {
    var debug: Function;
}

globalThis.debug = () => {
    isDebugging = !isDebugging;

    isDebugging ?  document.dispatchEvent(OnDebuggingEnabled) : document.dispatchEvent(OnDebuggingDisabled)
}

var isDebugging=false;
const OnDebuggingEnabled = new CustomEvent('debugenabled');
const OnDebuggingDisabled = new CustomEvent('debugdisabled')
//#endregion

// Variables
const container = document.getElementById('container');

// Tools
const moveTool = document.getElementById('move')
const selectTool = document.getElementById('select');

// Inputs
const fileUpload = document.getElementById('ifc-file-upload') as HTMLInputElement;
const projection = document.getElementById('projection') as HTMLSelectElement;
const navigation = document.getElementById('navigation') as HTMLSelectElement;

// Windows
var modelManagerContainer :HTMLElement;
const openModelManager = document.getElementById('open-model-manager')

var propertyTree: HTMLElement
var propertyTreeContainer: HTMLElement;

var propertiesContainer: HTMLElement;
const openProperties = document.getElementById('open-properties');

// Components
const components = new COM.Components();
const exporter = components.get(COM.IfcJsonExporter);
const ifcloader = components.get(COM.IfcLoader);
const worlds = components.get(COM.Worlds);
const world = worlds.create<COM.SimpleScene, COM.OrthoPerspectiveCamera, COM.SimpleRenderer>();
const clipper = components.get(COM.Clipper);
const cullers = components.get(COM.Cullers);
const boundingBoxer = components.get(COM.BoundingBoxer);
const casters = components.get(COM.Raycasters);
const grids = components.get(COM.Grids);
const propsManager = components.get(COM.IfcPropertiesManager);
const highlighter = components.get(OBF.Highlighter);

const webIfc = new WEBIFC.IfcAPI();
const cameraFitting = {
    cover: false,
    paddingLeft: 5,
    paddingRight: 5,
    paddingBottom: 5,
    paddingTop: 5,
};

var grid: COM.SimpleGrid;
var caster: COM.SimpleRaycaster;
var culler: COM.MeshCullerRenderer;
var currentTool: Tools;

var transformControls: THREE.Group;
var upControl: THREE.Mesh;
var leftControl: THREE.Mesh;
var forwardControl: THREE.Mesh;

var selectedModel: THREE.Object3D;
var boundingBoxes = [] as IFCUtility.BoundingBoxData[];
var mouseMoveAmount = 0;
var cameraInput = new THREE.Vector3;

enum Tools {
    Select,
    Move,
}

Initialize();

async function Initialize(): Promise<void> {
    InitializeTransformControls();
    InitializeComponents();
    InitializeTools();
    InitializeInputs();
    InitializeWindows();

    webIfc.SetWasmPath("https://unpkg.com/web-ifc@0.0.66/", true);
    await webIfc.Init();
    IFCUtility.Setup(webIfc, culler, highlighter, boundingBoxer);
    

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
                    mesh.material = new THREE.MeshBasicMaterial({depthFunc: THREE.AlwaysDepth, color: material.color});
                }

                if (mesh.name == 'UP')
                    upControl = mesh;
                else if (mesh.name == 'LEFT')
                    leftControl = mesh;
                else if (mesh.name == 'FORWARD')
                    forwardControl = mesh;
            })

            world.scene.three.add(model)
            model.visible = false;
            transformControls = model;
            ScaleTransformControls();
        });

        //Transform Controls
        container.addEventListener('mousedown', () => {
            const result = caster.castRay([upControl, leftControl, forwardControl]);
            if (!result)
                return;

            world.camera.controls.enabled = false;
            var axis = new THREE.Vector3();
            if (result.object == upControl)
                axis.set(0, 1, 0);
            else if (result.object == leftControl)
                axis.set(1, 0, 0)
            else
                axis.set(0, 0, 1)

            document.addEventListener('mousemove', MoveModel)

            document.addEventListener('mouseup', () => {
                world.camera.controls.enabled = true;
                document.removeEventListener('mousemove', MoveModel)

                selectedModel.updateWorldMatrix(false, true);
                for(const child of selectedModel.children) {
                    const colorMesh = culler.colorMeshes.get(child.uuid)
                    if(colorMesh != undefined) {
                        colorMesh.position.setScalar(0);

                        //colorMesh.setMatrixAt(0, new THREE.Matrix4())
                        colorMesh.applyMatrix4(child.matrixWorld)
                        colorMesh.updateMatrix();   
                    }
                }
                culler.needsUpdate = true;
            }, { once: true })

            function MoveModel(e: MouseEvent) {
                var forward = new THREE.Vector3();
                world.camera.three.getWorldDirection(forward)

                const yaw = world.camera.three.rotation.z;

                const left = new THREE.Vector3();
                left.x = -Math.cos(yaw);
                left.y = 0;
                left.z = Math.sin(yaw);

                const up = forward.clone().cross(left);
                const mouseMovement = new THREE.Vector2(e.movementX * .002 * result.distance, e.movementY * .002 * result.distance);

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

            if (currentTool == Tools.Move) {
                const geometries = [] as THREE.Mesh[]
                boundingBoxes.forEach(boundingBox => {
                    boundingBox.outline.visible = false;
                    geometries.push(boundingBox.boxMesh);
                })

                const result = caster.castRay(geometries);
                if (!result) {
                    transformControls.visible = false;
                    selectedModel = null;
                    return;
                }

                const outline = boundingBoxes.find(value => value.boxMesh == result.object).outline;

                outline.visible = true;
                transformControls.visible = true;
                transformControls.position.copy(outline.parent.position);
                selectedModel = outline.parent;

                ScaleTransformControls();
            }
        })

        container.addEventListener('mousemove', ScaleTransformControls)
        container.addEventListener('wheel', ScaleTransformControls)
    }

    function ScaleTransformControls() {
        if(world.camera.projection.current == 'Orthographic') {
            transformControls.scale.setScalar(45 / world.camera.threeOrtho.zoom);
        } else {
            var distance = transformControls.position.distanceTo(world.camera.three.position);
            transformControls.scale.setScalar(distance + 2);
        } 
    }

    function InitializeTools() {
        moveTool.addEventListener('click', () => {
            currentTool = Tools.Move
            moveTool.classList.add('tool-selected')
            selectTool.classList.remove('tool-selected')
            highlighter.clear();
            highlighter.enabled = false;
        })

        selectTool.addEventListener('click', () => {
            currentTool = Tools.Select
            selectTool.classList.add('tool-selected')
            moveTool.classList.remove('tool-selected')
            highlighter.enabled = true;
            transformControls.visible = false;
            selectedModel = null;
        })

        document.addEventListener('keydown', (e) => {
            if (e.key == 'f') {
                if (!selectedModel)
                    return;
    
                boundingBoxer.dispose();
                boundingBoxer.reset();
                boundingBoxer.add(selectedModel as FRA.FragmentsGroup);
    
                const box3 = boundingBoxer.get();
                world.camera.controls.fitToBox(box3, true, cameraFitting).then(ScaleTransformControls);
            }
        })
    }

    function InitializeInputs() {
        fileUpload.addEventListener('input', () => {
            const file = fileUpload.files[0];
            if (!file)
                return;

            const reader = new FileReader();
            reader.onload = () => {
                const data = new Uint8Array(reader.result as ArrayBuffer);
                LoadIFCModel(data, file.name.split(".ifc")[0]);
            }

            reader.readAsArrayBuffer(file);
        })

        projection.oninput = () => {
            switch (projection.value) {
                case "perspective":
                    world.camera.projection.set("Perspective");
                    grid.fade = true;
                    break;
                case "orthographic":
                    if(world.camera.mode.id == 'FirstPerson') {
                        projection.value = 'perspective'
                        break;
                    }

                    world.camera.projection.set("Orthographic");
                    grid.fade = false;
                    break;
            }
        };

        navigation.oninput = () => {
            if(world.camera.projection.current == 'Orthographic') {
                navigation.value = 'Orbit'
                return;
            }

            world.camera.set(navigation.value as COM.NavModeID);
        };
    }

    function InitializeWindows() {
        const modelManagerWindow = UIUtility.CreateWindow('Model Manager', document.body);
        modelManagerContainer = modelManagerWindow[1];
        openModelManager.addEventListener('click', () => modelManagerWindow[0].style.visibility = 'visible')

        function ClearParts() {
            const parts = propertiesContainer.getElementsByClassName('part')
            for (var i = parts.length - 1; i >= 0; i--) {
                parts.item(i).remove();
            }
        }
        highlighter.events.select.onClear.add(ClearParts)
        highlighter.events.select.onBeforeHighlight.add(ClearParts);
        
        const propertiesWindow = UIUtility.CreateWindow('Properties', document.body);
        propertiesContainer = propertiesWindow[1];
        openProperties.addEventListener('click', () => propertiesWindow[0].style.visibility = 'visible')

        const propertyTreeWindow = UIUtility.CreateWindow('Property Tree', document.body);
        propertyTree = propertyTreeWindow[0];
        propertyTreeContainer = propertyTreeWindow[1];
        
    }

    function InitializeComponents() {
        ifcloader.setup();

        UI.Manager.init()
        components.init();

        world.scene = new COM.SimpleScene(components);
        world.renderer = new COM.SimpleRenderer(components, container);
        world.camera = new COM.OrthoPerspectiveCamera(components);
        
        document.addEventListener('keydown', e => {
            if(!e.repeat) {
                if((e.key == 'w' && cameraInput.x != 1) || (e.key == 's' && cameraInput.x != -1))
                    cameraInput.add(new THREE.Vector3(Number(e.key == 'w') + -Number(e.key == 's'), 0, 0))
                
                if((e.key == 'd' && cameraInput.y != 1) || (e.key == 'a' && cameraInput.y != -1)) 
                    cameraInput.add(new THREE.Vector3(0, Number(e.key == 'd') + -Number(e.key == 'a'), 0))
                
                if((e.key == ' ' && cameraInput.z != -1) || (e.shiftKey && cameraInput.z != 1))
                    cameraInput.add(new THREE.Vector3(0, 0, -Number(e.key == ' ') + Number(e.key == 'Shift')))
            }   
        })
        
        document.addEventListener('keyup', e => {
            if(e.repeat)
                return;
            
            cameraInput.sub(new THREE.Vector3(Number(e.key == 'w') + -Number(e.key == 's'), Number(e.key == 'd') + -Number(e.key == 'a'), -Number(e.key == ' ') + Number(e.key == 'Shift')))
        })

        const cameraControls = world.camera.controls;
        const clock = new THREE.Clock();
        clock.start();
        setInterval(()=> {
            const deltaTime = clock.getDelta();

            const input = cameraInput.clone().multiplyScalar(deltaTime * 10);
            cameraControls.truck(input.y, input.z, true);
            cameraControls.forward(input.x, true);
        }, 10);

        world.scene.setup({ backgroundColor: new THREE.Color(.05, .05, .05) });

        highlighter.setup({ world });

        grid = grids.create(world);
        caster = casters.get(world);
        
        clipper.enabled = true;
        clipper.setup({ color: new THREE.Color(1, 1, 1) })
       
        culler = cullers.create(world);
        culler.config.threshold = 0;
        culler.needsUpdate = true;
        
        culler.config.renderDebugFrame = true;
        culler.config.width = 350;
        culler.config.height = 350;

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
        
        world.camera.controls.addEventListener("sleep", () => {
            culler.needsUpdate = true;
        });
    }
}

async function LoadIFCModelUsingURL(url : string) : Promise<FRA.FragmentsGroup> {
    const response = await fetch(url);

    return await LoadIFCModel(await response.arrayBuffer(), url.split('/').pop().split(".ifc")[0]);
}

async function LoadIFCModel(arrayBuffer: ArrayBuffer, name: string): Promise<FRA.FragmentsGroup> {
    const data = new Uint8Array(arrayBuffer);
    const model = await ifcloader.load(data);
    const modelID = webIfc.OpenModel(data);
    model.name = name;
    
    const boundingBoxData = IFCUtility.CreateBoundingBox(model, true);
    boundingBoxes.push(boundingBoxData)

    model.children.forEach(child => {
        if(child instanceof FRA.FragmentMesh) 
            culler.add(child)
    })

    world.camera.controls.fitToBox(boundingBoxData.boxMesh, true, cameraFitting);
    world.scene.three.add(model);

    selectTool.addEventListener('click', () => boundingBoxData.outline.visible = false)
    
    const indexer = components.get(COM.IfcRelationsIndexer);
    await indexer.process(model);
    
    highlighter.events.select.onHighlight.add(async fragmentIdMap => {
        var currentID = -1;
        for (const fragmentID in fragmentIdMap) {
            fragmentIdMap[fragmentID].forEach(async propertyID => {
                if (currentID == -1) {
                    currentID = propertyID;
                    const properties = await model.getProperties(propertyID);
                    if (!properties)
                        return;

                    CreatePart(properties);
                    return;
                }

                if (currentID != propertyID) {
                    currentID = propertyID;
                    const properties = await model.getProperties(propertyID);
                    if (!properties)
                        return;
                    CreatePart(properties);
                }

            })
        }
    })

    AddModelToManager();
    return model;

    function AddModelToManager() {
        const modelItem = document.createElement('div');
        modelItem.classList.add("model-item")
        modelManagerContainer.append(modelItem);

        const modelName = document.createElement('div');
        modelName.innerHTML = model.name;
        modelName.classList.add("model-name")
        modelItem.append(modelName);

        UIUtility.CreateColorInput('#ffffff', modelItem, (e) => {
            const value = (e.target as HTMLInputElement).value;
            const hex = '0x' + value.split('#')[1]
          
            console.log(hex)
            boundingBoxData.outline.material.color.setHex(parseInt(hex));
        }, 'Bounding Box Color');

        const modelPropertyTree = document.createElement('i');
        modelPropertyTree.addEventListener('click', async ()=> {
            IFCUtility.CreateTypeFoldouts(model,data,propertyTreeContainer, modelID);
            propertyTree.style.visibility = 'visible'
        })
        modelPropertyTree.title = 'Property Tree'
        modelPropertyTree.classList.add('model-property-tree', 'material-symbols-outlined', 'unselectable', 'small-button')
        modelPropertyTree.innerHTML = 'list'
        modelItem.append(modelPropertyTree);

        const hideModel = document.createElement('i');
        hideModel.addEventListener('click', () => {
            model.visible = !model.visible
            hideModel.innerHTML = model.visible ? 'visibility' : 'visibility_off';
            boundingBoxData.outline.layers.set(model.visible ? 0 : 1);

            if (selectedModel == model && !model.visible)
                transformControls.visible = false;
            else if (selectedModel == model)
                transformControls.visible = true;
        })
        hideModel.title = 'Visibilty';
        hideModel.classList.add('model-hide', 'material-symbols-outlined', 'unselectable', 'small-button')
        hideModel.innerHTML = "visibility"
        modelItem.append(hideModel);

        const deleteModel = document.createElement('i');
        deleteModel.addEventListener('click', () => {
            if (model == selectedModel)
                transformControls.visible = false;

            world.scene.three.remove(model)

            const index = boundingBoxes.indexOf(boundingBoxData, 0);
            if (index > -1) {
                boundingBoxes.splice(index, 1);
            }

            webIfc.CloseModel(modelID);
            modelManagerContainer.removeChild(modelItem);
            model.dispose();
        });
        deleteModel.title = 'Delete'
        deleteModel.classList.add('model-delete', 'material-symbols-outlined', 'unselectable', 'small-button')
        deleteModel.innerHTML = 'delete';
        modelItem.append(deleteModel);
    }

    function CreatePart(data: { [attribute: string]: any }) {
        const part = document.createElement('div');
        part.innerHTML = data.Name.value;
        part.classList.add('part')
        propertiesContainer.append(part)

        for (const prop in data) {
            if(data[prop]&& data[prop].value)
                CreateProperty(prop.toString(), data[prop].value);
        }

        function CreateProperty(name:string, value:string) {
            const property = document.createElement('div');
            property.classList.add('property')

            const propertyName = document.createElement('div');
            propertyName.classList.add('property-title');
            propertyName.innerHTML = name;

            const propertyValue = document.createElement('div');
            propertyValue.classList.add('property-value')
            propertyValue.innerHTML = value;

            property.append(propertyName);
            property.append(propertyValue);

            part.append(property)
        }
    }
}