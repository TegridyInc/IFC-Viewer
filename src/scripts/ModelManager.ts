import { FragmentsGroup } from "@thatopen/fragments";

import * as UIUtility from './UIUtility';
import * as IFCUtility from './IFCUtility';
import * as THREE from "three";

declare global {
    var modelManager: WindowData;
}

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

function AddModelToManager(model: FragmentsGroup) {
    const modelDispatcher = new THREE.EventDispatcher<ModelDispatcher>();

    const modelItem = document.createElement('div');
    modelItem.classList.add("model-item")
    modelManagerContainer.append(modelItem);

    const modelName = document.createElement('div');
    modelName.innerHTML = model.name;
    modelName.classList.add("model-name")
    modelItem.append(modelName);

    const boundingBox = model.userData.boundingBox;

    model.userData.dispatcher = modelDispatcher;

    UIUtility.CreateColorInput('#ffffff', modelItem, (e) => {
        /*
        const value = (e.target as HTMLInputElement).value;
        const hex = '0x' + value.split('#')[1]

        boundingBox.outline.material.color.setHex(parseInt(hex));
        */
    }, 'Bounding Box Color');

    UIUtility.CreateButton('stacks', modelItem, async () => {
        modelDispatcher.dispatchEvent({ type: 'plans' })
    })
    UIUtility.CreateButton('list', modelItem, () => {
        modelDispatcher.dispatchEvent({ type: "propertyTree" });
    }, 'Property Tree');

    UIUtility.CreateButton('visibility', modelItem, (e) => {
        const button = e.target as HTMLElement;
        model.visible = !model.visible
        button.innerHTML = model.visible ? 'visibility' : 'visibility_off';

        modelDispatcher.dispatchEvent({ type: "visible", isVisible: model.visible })
        /*
        boundingBox.outline.layers.set(model.visible ? 0 : 1);

        if (selectedModel == model && !model.visible)
            transformControls.visible = false;
        else if (selectedModel == model)
            transformControls.visible = true;
        */
    }, 'Visibility');

    UIUtility.CreateButton('delete', modelItem, () => {
        /*
        if (model == selectedModel)
            transformControls.visible = false;

        Components.world.scene.three.remove(model)

        const index = boundingBoxes.indexOf(boundingBoxData, 0);
        if (index > -1) {
            boundingBoxes.splice(index, 1);
        }
        */
        onModelRemoved = new CustomEvent('onModelDeleted', { detail: model });
        webIFC.CloseModel(model.userData.modelID);
        modelManagerContainer.removeChild(modelItem);
        model.dispose();
    }, 'Delete');
}