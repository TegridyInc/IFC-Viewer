import * as FRA from '@thatopen/fragments'
import * as Components from '../Viewer/Components'
import { ModelFoldouts } from '../Utility/IFCUtility'
import { IFCModel }  from '../Viewer/IFCModel'
import { Window } from '../Utility/UIUtility'
import * as React from 'react'

var ifcModels: IFCModel[] = [];

document.addEventListener('onModelAdded', (e:CustomEvent<IFCModel>)=>{
    ifcModels.push(e.detail)
})

export default function Properties() {
    const propertiesRootRef = React.useRef<HTMLDivElement>(undefined);
    const propertiesContainerRef = React.useRef<HTMLDivElement>(undefined);

    const [properties, setProperties] = React.useState(undefined);

    const mounted = React.useRef(false);
    React.useEffect(()=>{
        if(!mounted.current) {
            mounted.current = true;

            const openProperties = document.getElementById('open-properties')
            openProperties.addEventListener('click', () => {
                if(propertiesContainerRef.current.parentElement == propertiesRootRef.current) {
                    propertiesRootRef.current.style.visibility = 'visible'
                }
            })
            
            Components.highlighter.events.select.onHighlight.add(async (fragmentIDMap)=>{
                setProperties([])
            
                var idsFound = []
                for (const fragmentIDs in fragmentIDMap) {
                    var selectedIFCModel: IFCModel;
            
                    ifcModels.forEach((ifcModel) => {
                        const object = ifcModel.object;

                        object.children.forEach(child => {
                            if (child.uuid == fragmentIDs) {
                                selectedIFCModel = ifcModel;
                                return;
                            }
                        })
                    })
            
                    if (!selectedIFCModel)
                        continue;
            
                    for (const fragmentID of fragmentIDMap[fragmentIDs]) {
                        const value = idsFound.find(value => {
                            if (value.ifcModel.id == selectedIFCModel.id) {
                                if (value.fragmentID == fragmentID)
                                    return true;
                            }
                        })
            
                        if (value != undefined)
                            continue;
            
                        idsFound.push({ ifcModel: selectedIFCModel, fragmentID: fragmentID })
                    }        
                }

                const elements = await Promise.all(idsFound.map(async value => {
                    const property = await webIFC.properties.getItemProperties(value.ifcModel.id, value.fragmentID);
                    
                    return (
                        <ModelFoldouts ifcModel={value.ifcModel}  property={property}></ModelFoldouts>
                    )
                }))

                setProperties(elements)
            })

            Components.highlighter.events.select.onClear.add(()=>{
                setProperties([])
            }) 
        }
    }, [])

    return (
        <Window label='Properties' root={propertiesRootRef} container={propertiesContainerRef}>
            {properties}
        </Window>
    );
}
