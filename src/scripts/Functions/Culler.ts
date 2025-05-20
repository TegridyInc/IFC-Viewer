import * as FRA from '@thatopen/fragments'
import { world, culler, fragmentHider } from '../Viewer/Components'
import {IFCDispatcher, IFCModel} from '../Viewer/IFC'

const meshState = new Map<string, boolean>();

document.addEventListener('onViewportLoaded', ()=>{
    world.camera.controls.addEventListener("sleep", () => {
        culler.needsUpdate = true;
    });
})

document.addEventListener('onModelAdded', (e:CustomEvent<IFCModel>)=>{
    const ifcModel = e.detail;

    ifcModel.children.forEach(child =>{
        if(child instanceof FRA.FragmentMesh) 
            culler.add(child);
    })
    culler.needsUpdate = true;
    
    ifcModel.dispatcher.addEventListener('onModelMoveEnd', UpdateColorMeshPosition)
    ifcModel.dispatcher.addEventListener('onVisibilityChanged', UpdateColorMeshVisibility)
})

function UpdateColorMeshVisibility(event: {target: IFCDispatcher}) {
    const model = event.target.ifc;

    if(!model.visible) {
        model.children.forEach(child => {
            if(child instanceof FRA.FragmentMesh) {
                const colorMesh = culler.colorMeshes.get(child.uuid);
                if (colorMesh != undefined) 
                    meshState.set(child.uuid, colorMesh.visible);
                else 
                    meshState.set(child.uuid, child.visible);
                
                fragmentHider.set(false, model.getFragmentMap(child.fragment.ids));
            } 
        })
        
        culler.needsUpdate = true;
    } else {
        model.children.forEach(child => {
            if(child instanceof FRA.FragmentMesh) {
                fragmentHider.set(meshState.get(child.uuid), model.getFragmentMap(child.fragment.ids));
            } 
        })

        culler.needsUpdate = true;
    }
}

function UpdateColorMeshPosition(event: {target: IFCDispatcher}) {
    const model = event.target.ifc;

    for (const child of model.children) {
        const colorMesh = culler.colorMeshes.get(child.uuid)
         
        if (colorMesh != undefined) {
            colorMesh.position.setScalar(0);

            colorMesh.applyMatrix4(child.matrixWorld)
            colorMesh.updateMatrix();
        }
    }

    culler.needsUpdate = true;
}

document.addEventListener('onModelRemoved', (e:CustomEvent<IFCModel>)=>{
    const ifcModel = e.detail;

    ifcModel.children.forEach(child=>{
        if(child instanceof FRA.FragmentMesh) 
            culler.remove(child);
    })

    ifcModel.dispatcher.removeEventListener('onModelMoveEnd', UpdateColorMeshPosition);
    ifcModel.dispatcher.removeEventListener('onVisibilityChanged', UpdateColorMeshVisibility)
})

