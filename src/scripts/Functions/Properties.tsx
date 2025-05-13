import * as FRA from '@thatopen/fragments'
import * as Components from '../Viewer/Components'
import { ModelFoldouts } from '../Utility/IFCUtility'
import { IFCModel }  from '../Viewer/IFC'
import { Stack } from '@mui/material'
import { WindowComponent } from '../Utility/UIUtility.component'
import * as React from 'react'

var ifcModels: IFCModel[] = [];

document.addEventListener('onModelAdded', (e:CustomEvent<IFCModel>)=>{
    ifcModels.push(e.detail)
})

export default function Properties() {
    const propertiesRootRef = React.useRef<HTMLDivElement>(undefined);
    const propertiesContainerRef = React.useRef<HTMLDivElement>(undefined);

    const [properties, setProperties] = React.useState([]);

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
                        ifcModel.children.forEach(child => {
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
                            if (value.ifcModel.ifcID == selectedIFCModel.ifcID) {
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
                    const property = await webIFC.properties.getItemProperties(value.ifcModel.ifcID, value.fragmentID);
                    
                    return (
                        <ModelFoldouts sx={{border: '1px solid var(--highlight-color)'}} ifcModel={value.ifcModel}  property={property}></ModelFoldouts>
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
        <WindowComponent label='Properties' root={propertiesRootRef} container={propertiesContainerRef}>
            {
                properties.length != 0 ?
                <Stack spacing={.5}>
                    {properties}
                </Stack>
                : <></>
            }
        </WindowComponent>
    );
}
