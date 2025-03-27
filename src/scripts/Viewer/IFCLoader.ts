import * as WEBIFC from 'web-ifc'
import * as FRA from '@thatopen/fragments';
import * as Components from './Components';
import * as IFCUtility from '../Utility/IFCUtility';
import * as Toolbars from './Toolbar'
import * as IFC from './IFCModel'

export async function LoadIFCModelUsingURL(url: string): Promise<FRA.FragmentsGroup> {
    const response = await fetch(url);

    return await LoadIFCModel(await response.arrayBuffer(), url.split('/').pop().split(".ifc")[0]);
}

export async function LoadIFCModel(arrayBuffer: ArrayBuffer, name: string, focus?: boolean) {
    const data = new Uint8Array(arrayBuffer);
    const ifcID = webIFC.OpenModel(data);
    const model = await Components.ifcloader.load(data);

    const ifcModel = new IFC.IFCModel();
    ifcModel.object = model;
    ifcModel.id = ifcID;
    
    await Components.indexer.process(model);
    await Components.classifier.bySpatialStructure(model, {
        isolate: new Set([WEBIFC.IFCBUILDINGSTOREY]),
    });

    model.userData.modelID = ifcID;
    model.name = name;

    const boundingBoxData = IFCUtility.CreateBoundingBox(ifcModel, false);
    model.userData.boundingBox = boundingBoxData;

    model.children.forEach(child => {
        if (child instanceof FRA.FragmentMesh) 
            Components.world.meshes.add(child)
    })

    if (focus)
        Components.world.camera.controls.fitToBox(ifcModel.boundingBox.boxMesh, true, {paddingBottom: 5, paddingTop: 5, paddingLeft: 5, paddingRight: 5});

    Components.world.scene.three.add(model);

    Toolbars.selectTool.addEventListener('click', () => ifcModel.boundingBox.outline.visible = false)

    globalThis.onModelAdded = new CustomEvent<IFC.IFCModel>('onModelAdded', { detail: ifcModel });
    document.dispatchEvent(globalThis.onModelAdded)

    return model;
}