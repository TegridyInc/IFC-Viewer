import * as FRA from '@thatopen/fragments'
import * as Components from '../Viewer/Components'
import * as IFCUtility from '../Utility/IFCUtility'
import * as UIUtility from '../Utility/UIUtility'

const propertiesWindow = UIUtility.CreateWindow('Properties', document.body);
const propertiesRoot = propertiesWindow[0];
const propertiesContainer = propertiesWindow[1];
const openProperties = document.getElementById('open-properties')

openProperties.addEventListener('click', () => {
    if (propertiesContainer == propertiesRoot)
        propertiesRoot.style.visibility = 'visible'
})

Components.highlighter.events.select.onHighlight.add(CreateProperties)

async function CreateProperties(fragmentIDMap: FRA.FragmentIdMap) {
    const sceneObjects = Components.world.scene.three.children;
    propertiesContainer.innerHTML = '';

    var idsFound = []
    for (const fragmentIDs in fragmentIDMap) {
        var modelID = -1;

        sceneObjects.forEach((object) => {
            if (!(object instanceof FRA.FragmentsGroup))
                return;
            object.children.forEach(child => {
                if (child.uuid == fragmentIDs) {
                    modelID = object.userData.modelID;
                    return;
                }
            })
        })

        if (modelID == -1)
            continue;

        for (const fragmentID of fragmentIDMap[fragmentIDs]) {
            const value = idsFound.find(value => {
                if (value.modelID == modelID) {
                    if (value.fragmentID == fragmentID)
                        return true;
                }
            })

            if (value != undefined)
                continue;

            idsFound.push({ modelID: modelID, fragmentID: fragmentID })
            await IFCUtility.CreateProperties(modelID, fragmentID, propertiesContainer)
        }

    }
}