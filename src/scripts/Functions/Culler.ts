import * as FRA from '@thatopen/fragments'
import * as Components from '../Viewer/Components'
import * as THREE from 'three'
import {IFCDispatcher, IFCModel} from '../Viewer/IFC'

const colorMeshes = new Map<string, boolean>();

document.addEventListener('onViewportLoaded', ()=>{
    Components.world.camera.controls.addEventListener("sleep", () => {
        Components.culler.needsUpdate = true;
    });
})

document.addEventListener('onModelAdded', (e:CustomEvent<IFCModel>)=>{
    const ifcModel = e.detail;

    ifcModel.children.forEach(child =>{
        if(child instanceof FRA.FragmentMesh) {
            Components.culler.add(child);
            colorMeshes.set(child.uuid, true);
        }
    })
    Components.culler.needsUpdate = true;
    
    ifcModel.dispatcher.addEventListener('onModelMoveEnd', UpdateColorMeshPosition)
    ifcModel.dispatcher.addEventListener('onVisibilityChanged', UpdateColorMeshVisibility)
})

function UpdateColorMeshVisibility(event: {target: IFCDispatcher}) {
    const model = event.target.ifc;

    if(!model.visible) {
        model.children.forEach(child => {
            const colorMesh = Components.culler.colorMeshes.get(child.uuid)
            if (colorMesh != undefined) {
                colorMeshes.set(child.uuid, colorMesh.visible);
                colorMesh.visible = false;
            }
        })

        Components.culler.needsUpdate = true;
    } else {
        model.children.forEach(child => {
            const colorMesh = Components.culler.colorMeshes.get(child.uuid)
            if (colorMesh != undefined) {
                colorMesh.visible = colorMeshes.get(child.uuid);
            }
        })

        Components.culler.needsUpdate = true;
    }
}

function UpdateColorMeshPosition(event: {target: IFCDispatcher}) {
    const model = event.target.ifc;

    for (const child of model.children) {
        const colorMesh = Components.culler.colorMeshes.get(child.uuid)
         
        if (colorMesh != undefined) {
            colorMesh.position.setScalar(0);

            colorMesh.applyMatrix4(child.matrixWorld)
            colorMesh.updateMatrix();
        }
    }

    Components.culler.needsUpdate = true;
}

document.addEventListener('onModelRemoved', (e:CustomEvent<IFCModel>)=>{
    const ifcModel = e.detail;

    ifcModel.children.forEach(child=>{
        if(child instanceof FRA.FragmentMesh) {
            Components.culler.remove(child);
            colorMeshes.delete(child.uuid);
        }
    })

    ifcModel.dispatcher.removeEventListener('onModelMoveEnd', UpdateColorMeshPosition);
    ifcModel.dispatcher.removeEventListener('onVisibilityChanged', UpdateColorMeshVisibility)
})

