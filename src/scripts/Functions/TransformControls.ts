import * as THREE from 'three'
import * as Toolbar from '../Viewer/Toolbar'
import * as Components from '../Viewer/Components'
import * as FBX from 'three/examples/jsm/loaders/FBXLoader';
import {IFCModel} from '../Viewer/IFCModel'

const models: IFCModel[] = [];
const fbxLoader = new FBX.FBXLoader();

var selectedModel : IFCModel;
var transformControls: THREE.Group;
var upControl: THREE.Mesh;
var leftControl: THREE.Mesh;
var forwardControl: THREE.Mesh;

var mouseMoveAmount = 0;
var moveToolEnabled = false;

document.addEventListener('onViewportLoaded', ()=>{
    const container = document.getElementById('container');
    
    
    //Transform Controls
    container.addEventListener('mousedown', () => {
        mouseMoveAmount = 0;
        document.addEventListener('mousemove', CalculateMouseMoveAmount)

        if(!selectedModel)
            return;

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

        selectedModel.dispatchEvent({type:'onModelMoveStart'})

        document.addEventListener('mousemove', MoveModel)

        document.addEventListener('mouseup', () => {
            Components.world.camera.controls.enabled = true;
            document.removeEventListener('mousemove', MoveModel)

            if (!selectedModel)
                return;

            const model = selectedModel.object;
            model.updateWorldMatrix(false, true);

            selectedModel.dispatchEvent({type: 'onModelMoveEnd'})

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

            selectedModel?.object.position.copy(transformControls.position);
            selectedModel?.dispatchEvent({type: 'onModelMove'})
        }
    })

    //Bounding Boxes
    container.addEventListener('mouseup', (e) => {
        document.removeEventListener('mousemove', CalculateMouseMoveAmount)

        if (e.button != 0 || mouseMoveAmount != 0 || !Toolbar.toolEnabled)
            return;

        if (moveToolEnabled) {
            ClearSelection();

            const geometries = [] as THREE.Mesh[]
            models.forEach(model => {
                geometries.push(model.boundingBox.boxMesh);
            })

            const result = Components.caster.castRay(geometries);
            if (!result)
                return;

            const ifcModel = models.find(model => model.boundingBox.boxMesh == result.object);
            const outline = ifcModel.boundingBox.outline;

            outline.visible = true;
            transformControls.visible = true;
            transformControls.position.copy(outline.parent.position);
            selectedModel = ifcModel;
            ifcModel.dispatchEvent({type: 'onModelSelected'})
        }
    })

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

    Components.world.camera.controls.addEventListener('control', ScaleTransformControls)
    Components.world.camera.controls.addEventListener('controlend', ScaleTransformControls)
})

document.addEventListener('onModelAdded', (e: CustomEvent<IFCModel>) => {
    const ifcModel = e.detail;
    models.push(ifcModel)

    ifcModel.addEventListener('onVisibilityChanged', e=>{
        if(!selectedModel)
            return;
        
        if (selectedModel.object == ifcModel.object && !ifcModel.object.visible)
            transformControls.visible = false;
        else if (selectedModel.object == ifcModel.object)
            transformControls.visible = true;
    })
})

document.addEventListener('onModelRemoved', (e:CustomEvent<IFCModel>)=>{
    const ifcModel = e.detail;
    if(selectedModel == ifcModel) {
        transformControls.visible = false;
        selectedModel = null;
    }

    const index = models.indexOf(ifcModel)

    if(index != -1) {
        models.splice(index, 1)
    }
})

document.addEventListener('onToolChanged', (e: CustomEvent) => {
    const tool = e.detail as Toolbar.Tools;

    if (tool != Toolbar.Tools.Move) {
        ClearSelection();
        transformControls.visible = false;
        moveToolEnabled = false;
    } else {
        moveToolEnabled = true;
    }
})

function CalculateMouseMoveAmount(e: MouseEvent) {
    mouseMoveAmount += e.movementX;
    mouseMoveAmount += e.movementY;
}


function ScaleTransformControls() {
    if (Components.world.camera.projection.current == 'Orthographic') {
        transformControls.scale.setScalar(45 / Components.world.camera.threeOrtho.zoom);
    } else {
        var distance = transformControls.position.distanceTo(Components.world.camera.three.position);
        transformControls.scale.setScalar(distance + 2);
    }
}

function ClearSelection() {
    selectedModel = null;
    transformControls.visible = false;

    models.forEach(model => {
        model.boundingBox.outline.visible = false;
    })
}