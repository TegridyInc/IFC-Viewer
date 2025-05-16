import * as FRA from '@thatopen/fragments'
import * as Components from '../Viewer/Components'
import * as THREE from 'three'
import {IFCDispatcher, IFCModel} from '../Viewer/IFC'

const meshState = new Map<string, boolean>();

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
    Components.culler.needsUpdate = true;
    
    ifcModel.dispatcher.addEventListener('onModelMoveEnd', UpdateColorMeshPosition)
    ifcModel.dispatcher.addEventListener('onVisibilityChanged', UpdateColorMeshVisibility)
})

function UpdateColorMeshVisibility(event: {target: IFCDispatcher}) {
    const model = event.target.ifc;

    if(!model.visible) {
        model.children.forEach(child => {
            if(child instanceof FRA.FragmentMesh) {
                const colorMesh = Components.culler.colorMeshes.get(child.uuid);
                if (colorMesh != undefined) 
                    meshState.set(child.uuid, colorMesh.visible);
                else 
                    meshState.set(child.uuid, child.visible);
                
                Components.fragmentHider.set(false, model.getFragmentMap(child.fragment.ids));
            } 
        })
        
        Components.culler.needsUpdate = true;
    } else {
        model.children.forEach(child => {
            if(child instanceof FRA.FragmentMesh) {
                Components.fragmentHider.set(meshState.get(child.uuid), model.getFragmentMap(child.fragment.ids));
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
        if(child instanceof FRA.FragmentMesh) 
            Components.culler.remove(child);
    })

    ifcModel.dispatcher.removeEventListener('onModelMoveEnd', UpdateColorMeshPosition);
    ifcModel.dispatcher.removeEventListener('onVisibilityChanged', UpdateColorMeshVisibility)
})

