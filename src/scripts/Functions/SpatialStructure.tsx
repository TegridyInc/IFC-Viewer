import * as React from 'react';
import {FoldoutComponent, WindowComponent, FoldoutElementComponent} from '../Utility/UIUtility.component'
import { IFCModel } from '../Viewer/IFCModel'

var openModel: IFCModel;

export default function SpatialStructure() {
    const spatialStructureRootRef = React.useRef<HTMLDivElement>(undefined)
    const spatialStructureContainerRef = React.useRef<HTMLDivElement>(undefined)

    const [spatialStructure, setSpatialStructure] = React.useState(undefined);

    const mounted = React.useRef(false);
    React.useEffect(()=>{
        if(!mounted.current) {
            mounted.current = true;

            const openSpatialStructure = document.getElementById('open-spatial-structure')

            openSpatialStructure.addEventListener('click', () => {
                spatialStructureRootRef.current.style.visibility = 'visible'
            })
            

            document.addEventListener('onModelAdded', (e:CustomEvent)=>{
                const ifcModel = e.detail as IFCModel;
                ifcModel.addEventListener('onModelSelected', async (event: {target: IFCModel})=>{
                    if(openModel == event.target)
                        return;
                    
                    const id = event.target.id;
                    openModel = event.target;
                
                    setSpatialStructure([]);
                    const spatialStructure = await webIFC.properties.getSpatialStructure(id, true);
                    const ifcProject = await webIFC.properties.getItemProperties(id, spatialStructure.expressID);
                
                    const elements = spatialStructure.children.map(child => {
                        return <SpatialStructureElement element={child}></SpatialStructureElement>
                    })

                    setSpatialStructure(
                        <FoldoutComponent sx={{border: '1px solid var(--highlight-color)'}} name={spatialStructure.type} header={<div style={{paddingLeft: '5px'}}>{ifcProject.Name.value}</div>}>
                            {elements}
                        </FoldoutComponent>
                    )
                });
            })

            function SpatialStructureElement(props: {element: any}) {
                if (props.element.children.length > 0) {
                    const children = props.element.children as any[];
                    const elements = children.map(child => {
                        return <SpatialStructureElement element={child}></SpatialStructureElement>
                    })

                    return (
                        <FoldoutComponent name={props.element.type} header={<div style={{paddingLeft: '5px'}}>{props.element.Name ? props.element.Name.value : ''}</div>}>
                            {elements}
                        </FoldoutComponent>
                    )
                } else {
                    return <FoldoutElementComponent label={props.element.Name.value + ` (${props.element.type})`}></FoldoutElementComponent>
                }
            }
        }
    }, [])

    return (
        <WindowComponent label='Spatial Structure' root={spatialStructureRootRef} container={spatialStructureContainerRef} >
            {spatialStructure}
        </WindowComponent>
    )
}

/*
const spatialStructureWindow = UIUtility.CreateWindow('Spatial Structure', document.body)

const openSpatialStructure = document.getElementById('open-spatial-structure')
const spatialStructureRoot = spatialStructureWindow[0];
const spatialStructureContainer = spatialStructureWindow[1];

var openModel:IFCModel;




*/