import * as THREE from 'three'
import * as Toolbars from './Toolbars'
import * as Components from './Components'
import * as FBX from 'three/examples/jsm/loaders/FBXLoader';
import { BoundingBoxData } from './IFCUtility';

const boundingBoxes: BoundingBoxData[] = [];
const fbxLoader = new FBX.FBXLoader();

var transformControls: THREE.Group;
var upControl: THREE.Mesh;
var leftControl: THREE.Mesh;
var forwardControl: THREE.Mesh;
var mouseMoveAmount = 0;

document.addEventListener('onModelAdded', (e: CustomEvent) => {
    boundingBoxes.push(e.detail.userData.boundingBox);
})

document.addEventListener('onToolChanged', (e: CustomEvent) => {
    const tool = e.detail as Toolbars.Tools;
    console.log(tool)
    if (tool != Toolbars.Tools.Move) {
        ClearSelection();
        transformControls.visible = false;
    }
})

function CalculateMouseMoveAmount(e: MouseEvent) {
    mouseMoveAmount += e.movementX;
    mouseMoveAmount += e.movementY;
}

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
    mouseMoveAmount = 0;
    document.addEventListener('mousemove', CalculateMouseMoveAmount)

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
    document.removeEventListener('mousemove', CalculateMouseMoveAmount)

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

Components.world.camera.controls.addEventListener('control', ScaleTransformControls)
Components.world.camera.controls.addEventListener('controlend', ScaleTransformControls)

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

    boundingBoxes.forEach(boundingBox => {
        boundingBox.outline.visible = false;
    })
}