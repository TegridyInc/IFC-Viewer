import * as COM from '@thatopen/components';
import * as OBF from '@thatopen/components-front';
import * as FRA from '@thatopen/fragments';
import * as UI from '@thatopen/ui';
import * as CUI from '@thatopen/ui-obc'
import * as WEBIFC from 'web-ifc'
import * as FBX from 'three/examples/jsm/loaders/FBXLoader';
import * as EXCELJS from 'exceljs'
import * as THREE from 'three';

// Variables
const container = document.getElementById('container');

// Tools
const moveTool = document.getElementById('move')
const selectTool = document.getElementById('select');

// Inputs
const fileUpload = document.getElementById('ifc-file-upload') as HTMLInputElement;
const projection = document.getElementById('projection') as HTMLSelectElement;

// Windows

const models = document.getElementById('models');
const modelsContainer = models.getElementsByClassName('window-container').item(0) as HTMLElement;
const modelsWindowHeader = document.getElementById('models-header');
const closeModelsManager = document.getElementById('close-models-window');
const openModelsManager = document.getElementById('open-model-manager')

const propertyTree = document.getElementById('property-tree');
const propertyTreeContainer = document.getElementById('property-tree-container')
const propertyTreeHeader = document.getElementById('property-tree-header');
const closePropertyTree = document.getElementById('close-property-tree')

const properties = document.getElementById('properties')
const propertiesContainer = properties.getElementsByClassName('window-container').item(0) as HTMLElement
const propertiesHeader = document.getElementById('properties-header')  
const closeProperties = document.getElementById('close-properties')
const openProperties = document.getElementById('open-properties');

// Components
const components = new COM.Components();
const exporter = components.get(COM.IfcJsonExporter);
const ifcloader = components.get(COM.IfcLoader);
const worlds = components.get(COM.Worlds);
const world = worlds.create<COM.SimpleScene, COM.OrthoPerspectiveCamera, COM.SimpleRenderer>();
const clipper = components.get(COM.Clipper);
const fragmentBbox = components.get(COM.BoundingBoxer);
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

var currentTool: Tools;

var transformControls: THREE.Group;
var upControl: THREE.Mesh;
var leftControl: THREE.Mesh;
var forwardControl: THREE.Mesh;

var selectedModel: THREE.Object3D;
var boundingBoxes = [] as THREE.Mesh[];
var mouseMoveAmount = 0;

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
                boundingBoxes.forEach(element => {
                    element.visible = false;
                })

                const result = caster.castRay(boundingBoxes);

                if (!result) {
                    transformControls.visible = false;
                    selectedModel = null;
                    return;
                }

                result.object.visible = true;
                transformControls.visible = true;
                transformControls.position.copy(result.object.parent.position);
                selectedModel = result.object.parent;

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
    
                fragmentBbox.dispose();
                fragmentBbox.reset();
                fragmentBbox.add(selectedModel as FRA.FragmentsGroup);
    
                const box3 = fragmentBbox.get();
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
                    world.camera.projection.set("Orthographic");
                    grid.fade = false;
                    break;
            }
        };
    }

    function InitializeWindows() {
        function MoveWindow(e : MouseEvent, window: HTMLElement) {
            window.style.top = `${window.offsetTop + e.movementY}px`;
            window.style.left = `${window.offsetLeft + e.movementX}px`;
        }

        const modelsWindow = function (e:MouseEvent) { MoveWindow(e, models) };

        modelsWindowHeader.addEventListener("mousedown", () => document.addEventListener("mousemove", modelsWindow))
        document.addEventListener("mouseup", () => document.removeEventListener("mousemove", modelsWindow))

        closeModelsManager.addEventListener("click", () => models.style.visibility = "hidden");
        openModelsManager.addEventListener("click", () => models.style.visibility = "visible");

        const propertiesWindow = function (e: MouseEvent) { MoveWindow(e, properties) };

        function ClearParts() {
            const parts = properties.getElementsByClassName('part')
            for (var i = parts.length - 1; i >= 0; i--) {
                parts.item(i).remove();
            }
        }
        highlighter.events.select.onClear.add(ClearParts)
        highlighter.events.select.onBeforeHighlight.add(ClearParts);
        propertiesHeader.addEventListener("mousedown", () => document.addEventListener("mousemove", propertiesWindow))
        document.addEventListener("mouseup", () => document.removeEventListener("mousemove", propertiesWindow))

        closeProperties.addEventListener("click", () => properties.style.visibility = "hidden");
        openProperties.addEventListener('click', () => properties.style.visibility = 'visible')

        const propertyWindow = function (e:MouseEvent) { MoveWindow(e, propertyTree)}
        
        propertyTreeHeader.addEventListener("mousedown", () => document.addEventListener("mousemove", propertyWindow))
        document.addEventListener("mouseup", () => document.removeEventListener("mousemove", propertyWindow))

        closePropertyTree.addEventListener('click', () => propertyTree.style.visibility = 'hidden')
    }

    function InitializeComponents() {
        ifcloader.setup();

        UI.Manager.init()
        components.init();

        world.scene = new COM.SimpleScene(components);
        world.renderer = new COM.SimpleRenderer(components, container);
        world.camera = new COM.OrthoPerspectiveCamera(components);
        world.scene.setup({ backgroundColor: new THREE.Color(.05, .05, .05) });

        highlighter.setup({ world });

        grid = grids.create(world);
        caster = casters.get(world);
        
        clipper.enabled = true;
        clipper.setup({ color: new THREE.Color(1, 1, 1) })
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

    fragmentBbox.reset();
    fragmentBbox.add(model);
    const bbox = fragmentBbox.getMesh();

    model.children.forEach(child => {
        child.position.sub(bbox.position);
    })

    bbox.geometry.computeBoundingBox();
    model.position.set(0,0,0)

    model.position.set(0, bbox.geometry.boundingBox.max.y, 0);

    const modelBB = bbox.clone();
    boundingBoxes.push(modelBB)
    modelBB.visible = false;
    modelBB.position.set(0, 0, 0)
    const material = modelBB.material as THREE.MeshBasicMaterial;
    material.wireframe = true;
    
    world.camera.controls.fitToBox(modelBB, true, cameraFitting);
    model.add(modelBB);

    fragmentBbox.dispose();
    world.scene.three.add(model);
    model.name = name;

    selectTool.addEventListener('click', () => modelBB.visible = false)
    
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
        modelsContainer.append(modelItem);

        const modelName = document.createElement('div');
        modelName.innerHTML = model.name;
        modelName.classList.add("model-name")
        modelItem.append(modelName);

        const modelPropertyTree = document.createElement('i');
        modelPropertyTree.addEventListener('click', async ()=> {
            ClearPropertyTree();
            propertyTree.style.visibility = 'visible'
            const props = webIfc.properties;
            const properties = model.getLocalProperties();
            const spatialStructure = await props.getSpatialStructure(modelID);

            for(const id in properties) {
                const property = properties[id];

                if(!webIfc.IsIfcElement(property.type))
                    continue;

                if(!((property instanceof WEBIFC.IFC2X3.IfcBuildingElement) ||  (property instanceof WEBIFC.IFC4.IfcBuildingElement) || (property instanceof WEBIFC.IFC4X3.IfcBuiltElement)))
                    continue;
                
                const container = CreateFoldout(property.Name.value, propertyTreeContainer);
                
                await CreateAttributesFoldout(property, container);
                await CreateMaterialFoldout(property, container);
                await CreatePropertySetsFoldout(property, container)
                await CreateSpatialElementFoldout(property, container);   
            }

            async function CreateAttributesFoldout(property: { [attribute: string]:any }, container:HTMLElement) {
                const attributesFoldout = CreateFoldout('Attributes', container);
                      
                CreateFoldoutElement('Class', webIfc.GetNameFromTypeCode(property.type), attributesFoldout)  
                
                const objectPlacement = await props.getItemProperties(modelID, property.ObjectPlacement.value);
                const relativePlacement = await props.getItemProperties(modelID, objectPlacement.RelativePlacement.value)
                const location = await props.getItemProperties(modelID, relativePlacement.Location.value);

                CreateFoldoutElement('Location', "X: " + location.Coordinates['0'].value + " Y: " + location.Coordinates['1'].value + " Z: " + location.Coordinates['2'].value , attributesFoldout);

                if(property.ObjectType)
                    CreateFoldoutElement('Object Type', property.ObjectType.value, attributesFoldout);
            }

            async function CreateMaterialFoldout(property: { [attribute: string]:any }, container:HTMLElement) {
                const materials = await props.getMaterialsProperties(modelID, property.expressID);
                materials.forEach(async materialProperty => {
                    if(materialProperty.ForLayerSet) {
                        const layerSet = await model.getProperties(materialProperty.ForLayerSet.value);
                        const layerSetContainer = CreateFoldout('Layers', container);
                        
                        for(const layerHandle in layerSet.MaterialLayers) {
                            const layer = await model.getProperties(layerSet.MaterialLayers[layerHandle].value);
                            const layerContainer = CreateFoldout('Layer', layerSetContainer)
                            
                            if(layer.LayerThickness)
                                CreateFoldoutElement('Layer Thickness', layer.LayerThickness.value, layerContainer)
                            
                            if(layer.Material) {
                                const material = await model.getProperties(layer.Material.value);
                                CreateFoldoutElement('Material', material.Name.value, layerContainer);
                            } else {
                                CreateFoldoutElement('Material', 'Undefined', layerContainer)
                            }
                        }
                    } else if(materialProperty.Materials) {
                        const materialsContainer = CreateFoldout('Materials', container)
                        for(const materialHandle in materialProperty.Materials) {
                            const material = await model.getProperties(materialProperty.Materials[materialHandle].value);
                            CreateFoldoutElement(material.Name.value, undefined, materialsContainer);
                        }
                    }
                    else 
                        CreateFoldoutElement('Material', materialProperty.Name.value, container);
                })
            }

            async function CreatePropertySetsFoldout(property: { [attribute: string]:any }, container:HTMLElement) {
                const propertySets = await props.getPropertySets(modelID, property.expressID);
                if(propertySets.length != 0) {
                    const propertySetsContainer = CreateFoldout('Property Sets', container);
                    propertySets.forEach(async propertySet => {
                        const propertySetFoldout = CreateFoldout(propertySet.Name.value, propertySetsContainer);
                        for(const Handle in propertySet.HasProperties) {
                            const singleValue = await model.getProperties(propertySet.HasProperties[Handle].value);
                            if(!singleValue.NominalValue)
                                return;
                           
                            CreateFoldoutElement(singleValue.Name.value, singleValue.NominalValue.value + (singleValue.Unit ? " " + singleValue.Unit.value : ""), propertySetFoldout);
                        }
                    })
                }
            }

            async function CreateSpatialElementFoldout(property: { [attribute: string]:any }, container:HTMLElement) {
                const spatialElementID = GetSpatialElement(spatialStructure, property.expressID);
                const spatialElement = await model.getProperties(spatialElementID);

                if(spatialElement) {
                    const spatialElementContainer = CreateFoldout('Spatial Element', container);
                    CreateFoldoutElement('Name', spatialElement.Name.value, spatialElementContainer);

                    if(spatialElement.Elevation)
                        CreateFoldoutElement('Elevation', spatialElement.Elevation.value, spatialElementContainer)
                }
            }

            function CreateFoldout(name: string, parent:HTMLElement): HTMLElement {
                const foldout = document.createElement('div');
                foldout.classList.add('foldout')
                parent.append(foldout)

                const foldoutHeader = document.createElement('div')
                foldoutHeader.classList.add('foldout-header')
                foldout.append(foldoutHeader)
                
                const foldoutButton = document.createElement('i')
                foldoutButton.addEventListener('click', (e)=> {
                    if(e.button != 0)
                        return;

                    foldoutButton.classList.toggle('arrow-open')
                    foldoutContainer.classList.toggle('foldout-container-open');
                    
                    foldoutContainer.style.height = foldoutButton.classList.contains('arrow-open') ? (foldoutContainer.scrollHeight + 'px') : ('0px')
                })
                foldoutButton.innerHTML = 'arrow_forward_ios'
                foldoutButton.classList.add('arrow', 'material-symbols-outlined', 'unselectable')
                foldoutHeader.append(foldoutButton);
                
                const foldoutName = document.createElement('div')
                foldoutName.innerHTML = name;
                foldoutName.classList.add('foldout-name')
                foldoutHeader.append(foldoutName)

                const foldoutContainer = document.createElement('div');
                foldoutContainer.classList.add('foldout-container');
                foldout.append(foldoutContainer);

                if(parent.classList.contains('foldout-container')) 
                    foldoutContainer.ontransitionend = () => {
                        var height = 0;
                        parent.childNodes.forEach(child => height += (child as HTMLElement).offsetHeight)
                        parent.style.height = height + 'px';
                    }

                return foldoutContainer;
            }

            function CreateFoldoutElement(label:string, value?:any, parent?:HTMLElement) {
                const foldoutElement = document.createElement('div');
                foldoutElement.classList.add('foldout-element')

                const foldoutLabel = document.createElement('div')
                foldoutLabel.innerHTML = ' - ' + label;
                foldoutLabel.classList.add('foldout-label')
                foldoutElement.append(foldoutLabel)

                if(value != undefined && value != null) {
                    const foldoutValue = document.createElement('div');
                    foldoutValue.innerHTML = value.toString();
                    foldoutValue.classList.add('foldout-value')
                    foldoutElement.append(foldoutValue)
                }

                parent?.append(foldoutElement);
            }

            function ClearPropertyTree() {
                for(var i = propertyTreeContainer.children.length - 1; i >= 0; i--) {
                    if(propertyTreeContainer.children.item(i).classList.contains('foldout'))
                        propertyTreeContainer.removeChild(propertyTreeContainer.children.item(i));
                }
            }

            function GetSpatialElement(spatialStructure:any, id:number) : number | null {
                if(!spatialStructure.children)
                    return null;

                for(const child in spatialStructure.children) {
                    if(spatialStructure.children[child].expressID == id)
                        return spatialStructure.expressID;
                    else {
                        const result = GetSpatialElement(spatialStructure.children[child], id);
                        if(result) 
                            return result;
                        
                        continue;
                    }
                }

                return null;
            }
        })
        modelPropertyTree.title = 'Property Tree'
        modelPropertyTree.classList.add('model-property-tree', 'material-symbols-outlined', 'unselectable', 'small-button')
        modelPropertyTree.innerHTML = 'list'
        modelItem.append(modelPropertyTree);

        const hideModel = document.createElement('i');
        hideModel.addEventListener('click', () => {
            model.visible = !model.visible
            hideModel.innerHTML = model.visible ? 'visibility' : 'visibility_off';
            modelBB.layers.set(model.visible ? 0 : 1);

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

            const index = boundingBoxes.indexOf(modelBB, 0);
            if (index > -1) {
                boundingBoxes.splice(index, 1);
            }

            models.removeChild(modelItem);
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