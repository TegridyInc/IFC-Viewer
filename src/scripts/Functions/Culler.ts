import * as FRA from '@thatopen/fragments'
import * as Components from '../Viewer/Components'
import * as IFC from '../Viewer/IFCModel'

document.addEventListener('onModelAdded', (e:CustomEvent)=>{
    const ifcModel = e.detail as IFC.IFCModel;
    const model = ifcModel.object;

    model.children.forEach(child =>{
        if(child instanceof FRA.FragmentMesh)
            Components.culler.add(child);
    })

    ifcModel.addEventListener('onModelMoveEnd', UpdateCuller)
})

function UpdateCuller(event: {target:IFC.IFCModel}) {
    const model = event.target.object;
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

document.addEventListener('onModelRemoved', (e:CustomEvent)=>{
    const ifcModel = e.detail as IFC.IFCModel;

    console.log(ifcModel)
    ifcModel.object.children.forEach(child=>{
        console.log(child)
        if(child instanceof FRA.FragmentMesh) {
            Components.culler.remove(child);
        }
    })

    ifcModel.removeEventListener('onModelMoveEnd', UpdateCuller);
})

Components.world.camera.controls.addEventListener("sleep", () => {
    Components.culler.needsUpdate = true;
});