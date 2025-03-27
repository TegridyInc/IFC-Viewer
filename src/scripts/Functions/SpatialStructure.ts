import * as UIUtility from '../Utility/UIUtility'
import { IFCModel } from '../Viewer/IFCModel'

const spatialStructureWindow = UIUtility.CreateWindow('Spatial Structure', document.body)

const openSpatialStructure = document.getElementById('open-spatial-structure')
const spatialStructureRoot = spatialStructureWindow[0];
const spatialStructureContainer = spatialStructureWindow[1];

var openModel:IFCModel;

openSpatialStructure.addEventListener('click', () => {
    spatialStructureRoot.style.visibility = 'visible'
})

document.addEventListener('onModelAdded', (e:CustomEvent)=>{
    const ifcModel = e.detail as IFCModel;
    ifcModel.addEventListener('onModelSelected', CreateSpatialStructure);
})

async function CreateSpatialStructure(event: {target:IFCModel}) {
    if(openModel == event.target)
        return;
    
    const id = event.target.id;
    openModel = event.target;

    spatialStructureContainer.innerHTML = '';
    const spatialStructure = await webIFC.properties.getSpatialStructure(id, true);
    const ifcProject = await webIFC.properties.getItemProperties(id, spatialStructure.expressID);

    const foldout = UIUtility.CreateFoldout(ifcProject.Name.value, spatialStructureContainer)
    const label = document.createElement('div');
    label.innerHTML = `(${spatialStructure.type})`;
    label.style.paddingLeft = '5px'
    foldout.header.append(label);

    spatialStructure.children.forEach(async child => {
        await CreateSpatialStructureElement(child, foldout.container)
    })
}

async function CreateSpatialStructureElement(element: any, parent: HTMLElement) {
    if (element.children.length > 0) {
        const foldout = UIUtility.CreateFoldout(element.Name ? element.Name.value : '', parent)

        const label = document.createElement('div');
        label.innerHTML = `(${element.type})`;
        if (element.Name.value != '')
            label.style.paddingLeft = '5px'
        foldout.header.append(label);

        for (const child of element.children) {
            CreateSpatialStructureElement(child, foldout.container);
        }
    } else {
        UIUtility.CreateFoldoutElement(element.Name.value + ` (${element.type})`, undefined, parent)
    }
}