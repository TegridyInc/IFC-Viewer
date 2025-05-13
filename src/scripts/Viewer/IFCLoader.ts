import * as WEBIFC from 'web-ifc'
import * as FRA from '@thatopen/fragments';
import * as THREE from 'three';
import * as Components from './Components';
import * as IFCUtility from '../Utility/IFCUtility';
import * as Toolbars from './Toolbar'
import {IFCModel, IFCGroup, IFCDispatcher} from './IFC'


export async function LoadIFCModelUsingURL(url: string): Promise<FRA.FragmentsGroup> {
    const response = await fetch(url);

    return await LoadIFCModel(await response.arrayBuffer(), url.split('/').pop().split(".ifc")[0]);
}

export async function LoadIFCModel(arrayBuffer: ArrayBuffer, name: string, focus?: boolean, group?: IFCGroup) {
    const data = new Uint8Array(arrayBuffer);
    const ifcID = webIFC.OpenModel(data);
    const model = await Components.ifcloader.load(data);
    
    const ifcModel = model as IFCModel;
    ifcModel.dispatcher = new IFCDispatcher();
    ifcModel.dispatcher.ifc = ifcModel;
    ifcModel.ifcID = ifcID;
    
    await Components.indexer.process(model);
    await Components.classifier.bySpatialStructure(model, {
        isolate: new Set([WEBIFC.IFCBUILDINGSTOREY]),
    });
    
    model.name = name;
    model.children.forEach(child => {
        if (child instanceof FRA.FragmentMesh) 
            Components.world.meshes.add(child)
    })
   
    if(!group) 
        group = CreateModelGroup(); 
    
    ifcModel.group = group;
    
    group.add(model)
    group.ifcModels.push(ifcModel)
    group.recaculateBoundingBox();

    if(focus)
        Components.world.camera.controls.fitToBox(group.boundingBox.boxMesh, true, {paddingBottom: 5, paddingTop: 5, paddingLeft: 5, paddingRight: 5});

    globalThis.onModelAdded = new CustomEvent<IFCModel>('onModelAdded', { detail: ifcModel });
    document.dispatchEvent(globalThis.onModelAdded)

    return model;
}

function CreateModelGroup(): IFCGroup {
    const group = new IFCGroup();
    Components.world.scene.three.add(group);
    return group;
}