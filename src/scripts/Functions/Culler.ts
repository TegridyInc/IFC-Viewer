import * as FRA from '@thatopen/fragments'
import * as Components from '../Viewer/Components'
import * as THREE from 'three'
import {IFCDispatcher, IFCModel} from '../Viewer/IFC'

document.addEventListener('onViewportLoaded', ()=>{
    Components.world.camera.controls.addEventListener("sleep", () => {
        Components.culler.needsUpdate = true;
    });
})

document.addEventListener('onModelAdded', (e:CustomEvent<IFCModel>)=>{
    const ifcModel = e.detail;

    ifcModel.children.forEach(child =>{
        if(child instanceof FRA.FragmentMesh)
            Components.culler.add(child);
    })

    ifcModel.dispatcher.addEventListener('onModelMoveEnd', UpdateCuller)
})

function UpdateCuller(event: {target: IFCDispatcher}) {
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
        }
    })

    ifcModel.dispatcher.removeEventListener('onModelMoveEnd', UpdateCuller);
})

