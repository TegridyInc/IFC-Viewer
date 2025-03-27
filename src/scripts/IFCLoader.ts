import * as WEBIFC from 'web-ifc'
import * as FRA from '@thatopen/fragments';
import * as Components from './Components';
import * as IFCUtility from './IFCUtility';
import * as IFCViewer from './IFCViewer';
import * as Toolbars from './Toolbars'

export async function LoadIFCModelUsingURL(url: string): Promise<FRA.FragmentsGroup> {
    const response = await fetch(url);

    return await LoadIFCModel(await response.arrayBuffer(), url.split('/').pop().split(".ifc")[0]);
}

export async function LoadIFCModel(arrayBuffer: ArrayBuffer, name: string, focus?: boolean) {
    const data = new Uint8Array(arrayBuffer);
    const modelID = webIFC.OpenModel(data);
    const model = await Components.ifcloader.load(data);

    Components.indexer.process(model);

    await Components.classifier.bySpatialStructure(model, {
        isolate: new Set([WEBIFC.IFCBUILDINGSTOREY]),
    });

    model.userData.modelID = modelID;
    model.name = name;

    const boundingBoxData = IFCUtility.CreateBoundingBox(model, false);
    model.userData.boundingBox = boundingBoxData;

    model.children.forEach(child => {
        if (child instanceof FRA.FragmentMesh) {
            Components.world.meshes.add(child)
            Components.culler.add(child)
        }
    })

    if (focus)
        Components.world.camera.controls.fitToBox(boundingBoxData.boxMesh, true, IFCViewer.cameraFitting);

    Components.world.scene.three.add(model);

    Toolbars.selectTool.addEventListener('click', () => boundingBoxData.outline.visible = false)
    await Components.indexer.process(model);

    globalThis.onModelAdded = new CustomEvent('onModelAdded', { detail: model });
    document.dispatchEvent(globalThis.onModelAdded)

    return model;
}

