import * as FRA from '@thatopen/fragments'

import * as Components from '../Viewer/Components'
import * as UIUtility from '../Utility/UIUtility';
import * as IFC from '../Viewer/IFCModel'

const modelManagerWindow = UIUtility.CreateWindow('Model Manager', document.body);
const modelManagerContainer = modelManagerWindow[1];
const openModelManager = document.getElementById('open-model-manager')
openModelManager.addEventListener('click', () => {
    if (modelManagerWindow[1].parentElement == modelManagerWindow[0])
        modelManagerWindow[0].style.visibility = 'visible'
})

document.addEventListener('onModelAdded', (e: CustomEvent) => {
    AddModelToManager(e.detail);
})

function AddModelToManager(ifcModel: IFC.IFCModel) {
    const model = ifcModel.object;

    const modelItem = document.createElement('div');
    modelItem.classList.add("model-item")
    modelManagerContainer.append(modelItem);

    const modelName = document.createElement('div');
    modelName.innerHTML = model.name;
    modelName.classList.add("model-name")
    modelItem.append(modelName);

    UIUtility.CreateColorInput('#ffffff', modelItem, (e) => {
        /*
        const value = (e.target as HTMLInputElement).value;
        const hex = '0x' + value.split('#')[1]

        boundingBox.outline.material.color.setHex(parseInt(hex));
        */
    }, 'Bounding Box Color');

    UIUtility.CreateButton('stacks', modelItem, async () => {
        ifcModel.dispatchEvent({type: 'onPlans'})
    })
    UIUtility.CreateButton('list', modelItem, () => {
        ifcModel.dispatchEvent({type: 'onPropertyTree'});
    }, 'Property Tree');

    UIUtility.CreateButton('visibility', modelItem, (e) => {
        const button = e.target as HTMLElement;
        model.visible = !model.visible
        button.innerHTML = model.visible ? 'visibility' : 'visibility_off';

        ifcModel.dispatchEvent({type: 'onVisibilityChanged', isVisible: model.visible});
    }, 'Visibility');

    UIUtility.CreateButton('delete', modelItem, () => {
        globalThis.onModelRemoved = new CustomEvent<IFC.IFCModel>('onModelRemoved', { detail: ifcModel });
        document.dispatchEvent(global.onModelRemoved);
        
        webIFC.CloseModel(ifcModel.id);

        Components.world.scene.three.remove(model)
        Components.fragmentManager.disposeGroup(ifcModel.object);
        ifcModel.object.children.forEach(child=> {
            if(child instanceof FRA.FragmentMesh)
                Components.world.meshes.delete(child);
        })

        modelManagerContainer.removeChild(modelItem);
        model.dispose();
        
    }, 'Delete');
}