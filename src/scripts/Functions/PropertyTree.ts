import * as IFCUtility from '../Utility/IFCUtility'
import * as UIUtility from '../Utility/UIUtility'
import * as IFC from '../Viewer/IFCModel'

const propertyTreeWindow = UIUtility.CreateWindow('Property Tree', document.body);
const propertyTreeRoot = propertyTreeWindow[0];
const propertyTreeContainer = propertyTreeWindow[1];

var modelOpen: IFC.IFCModel;

document.addEventListener('onModelAdded', (e: CustomEvent) => {
    RegisterModel(e.detail);
})

function RegisterModel(ifcModel: IFC.IFCModel) {
    ifcModel.addEventListener('onPropertyTree', OpenPropertyTree)
}

function OpenPropertyTree(event: { target: IFC.IFCModel}) {
    if(modelOpen == event.target) {
        return;
    }

    modelOpen =  event.target;
    IFCUtility.CreateTypeFoldouts(event.target.object, propertyTreeContainer,  event.target.id);

    if (propertyTreeContainer.parentElement == propertyTreeRoot)
        propertyTreeRoot.style.visibility = 'visible'
}

document.addEventListener('onModelRemoved', (e: CustomEvent<IFC.IFCModel>) =>{
    if(e.detail == modelOpen) {
        propertyTreeContainer.innerHTML = '';
        modelOpen = null;
    }

    e.detail.removeEventListener('onPropertyTree', OpenPropertyTree)
})