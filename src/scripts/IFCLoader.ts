import * as WEBIFC from 'web-ifc'
import * as FRA from '@thatopen/fragments';
import * as Components from './Components';
import * as IFCUtility from './IFCUtility';
import * as IFCViewer from './IFCViewer';
import * as UIUtility from './UIUtility';
import * as Toolbars from './Toolbars'

export async function LoadIFCModelUsingURL(url : string) : Promise<FRA.FragmentsGroup> {
    const response = await fetch(url);

    return await LoadIFCModel(await response.arrayBuffer(), url.split('/').pop().split(".ifc")[0]);
}

export async function LoadIFCModel(arrayBuffer: ArrayBuffer, name: string, focus?:boolean) {
    const data = new Uint8Array(arrayBuffer);
    const modelID = IFCViewer.webIfc.OpenModel(data);
    const model = await Components.ifcloader.load(data);

    Components.indexer.process(model);

    await Components.classifier.bySpatialStructure(model, {
        isolate: new Set([WEBIFC.IFCBUILDINGSTOREY]),
    });

    model.userData.modelID = modelID;
    model.name = name;

    const boundingBoxData = IFCUtility.CreateBoundingBox(model, true);
    IFCViewer.boundingBoxes.push(boundingBoxData)

    model.children.forEach(child => {
        if(child instanceof FRA.FragmentMesh) {
            Components.world.meshes.add(child)
            Components.culler.add(child)
        }
    })

    if(focus)
        Components.world.camera.controls.fitToBox(boundingBoxData.boxMesh, true, IFCViewer.cameraFitting);
    
    Components.world.scene.three.add(model);

    Toolbars.selectTool.addEventListener('click', () => boundingBoxData.outline.visible = false)
    await Components.indexer.process(model);

    AddModelToManager(model, data, boundingBoxData);
    return model;
}

function AddModelToManager(model: FRA.FragmentsGroup, data:Uint8Array, boundingBoxData:IFCUtility.BoundingBoxData) {
    const modelItem = document.createElement('div');
    modelItem.classList.add("model-item")
    IFCViewer.modelManagerContainer.append(modelItem);

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

    UIUtility.CreateButton('list', modelItem, () =>{
        IFCUtility.CreateTypeFoldouts(model, data, IFCViewer.propertyTreeContainer, model.userData.modelID);

        if(IFCViewer.propertyTreeContainer.parentElement == IFCViewer.propertyTree)
            IFCViewer.propertyTree.style.visibility = 'visible'
    }, 'Property Tree');

    UIUtility.CreateButton('visibility', modelItem, (e) => {
        const button = e.target as HTMLElement;
        model.visible = !model.visible
        button.innerHTML = model.visible ? 'visibility' : 'visibility_off';
        boundingBoxData.outline.layers.set(model.visible ? 0 : 1);

        if (IFCViewer.selectedModel == model && !model.visible)
            IFCViewer.transformControls.visible = false;
        else if (IFCViewer.selectedModel == model)
            IFCViewer.transformControls.visible = true;
    }, 'Visibility');

    UIUtility.CreateButton('delete', modelItem, () => {
        if (model == IFCViewer.selectedModel)
            IFCViewer.transformControls.visible = false;

        Components.world.scene.three.remove(model)

        const index = IFCViewer.boundingBoxes.indexOf(boundingBoxData, 0);
        if (index > -1) {
            IFCViewer.boundingBoxes.splice(index, 1);
        }

        IFCViewer.webIfc.CloseModel(model.userData.modelID);
        IFCViewer.modelManagerContainer.removeChild(modelItem);
        model.dispose();
    }, 'Delete');
}