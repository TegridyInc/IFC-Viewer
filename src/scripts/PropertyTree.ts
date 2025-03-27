import * as FRA from '@thatopen/fragments'
import { EventDispatcher } from 'three';

import * as IFCUtility from './IFCUtility'
import * as UIUtility from './UIUtility'

const propertyTreeWindow = UIUtility.CreateWindow('Property Tree', document.body);
globalThis.propertyTree = { root: propertyTreeWindow[0], container: propertyTreeWindow[1] };

document.addEventListener('onModelAdded', (e: CustomEvent) => {
    RegisterModel(e.detail);
})

function RegisterModel(model: FRA.FragmentsGroup) {
    const dispatcher = model.userData.dispatcher as EventDispatcher<ModelDispatcher>;

    dispatcher.addEventListener('propertyTree', () => {
        IFCUtility.CreateTypeFoldouts(model, propertyTree.container, model.userData.modelID);

        if (propertyTree.container.parentElement == propertyTree.root)
            propertyTree.root.style.visibility = 'visible'
    })
}

