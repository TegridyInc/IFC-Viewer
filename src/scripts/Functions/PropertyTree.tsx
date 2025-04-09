import * as React from 'react'
import * as FRA from '@thatopen/fragments'
import * as Components from '../Viewer/Components'
import * as THREE from 'three'
import { Window, Foldout, FoldoutElement, Button } from '../Utility/UIUtility'
import { ModelFoldouts } from '../Utility/IFCUtility'
import {IFCModel} from '../Viewer/IFCModel'
/*
*/
      
interface TypeData {
    objects: { [attibute: string]: any }[];
    threeObjects: FRA.FragmentMesh[];
    fragmentIDMap: { [attribute: string]: any };
    type: number;
}

export default function PropertyTree() {
    const [ifcModel, setIFCModel] = React.useState<IFCModel>();

    const propertyTreeRoot = React.useRef<HTMLDivElement>(undefined);
    const propertyTreeContainer = React.useRef<HTMLDivElement>(undefined);

    const mounted = React.useRef(false);

    React.useEffect(()=>{
        if(!mounted.current) {
            mounted.current = true;
            
            document.addEventListener('onModelAdded', (e: CustomEvent<IFCModel>) => {
                e.detail.addEventListener('onPropertyTree', OpenPropertyTree)
            })

            document.addEventListener('onModelRemoved', (e: CustomEvent<IFCModel>) =>{
                setIFCModel(oldIFCModel => oldIFCModel == e.detail ? undefined : oldIFCModel)
                    
                e.detail.removeEventListener('onPropertyTree', OpenPropertyTree)
            })
        }
    }, []);

    return(
        <Window label='Property Tree' root={propertyTreeRoot} container={propertyTreeContainer} >
            <TypeFoldouts ifcModel={ifcModel}></TypeFoldouts>
        </Window>
    )

    function OpenPropertyTree(event: { target: IFCModel}) {
        if(ifcModel == event.target) {
            return;
        }
    
        setIFCModel(event.target)

        if(propertyTreeContainer.current.parentElement == propertyTreeRoot.current) {
            propertyTreeRoot.current.style.visibility = 'visible';
        }
    }
} 

export function TypeFoldouts(props: { ifcModel: IFCModel }) {
    const [items, setItems] = React.useState([]);

    const mounted = React.useRef(false);

    React.useEffect(()=>{
        if(!mounted.current) {
            mounted.current = true;
            
            document.addEventListener('onModelAdded', (e: CustomEvent<IFCModel>) => {
                e.detail.addEventListener('onPropertyTree', UpdateItems)
            })
        }
    }, []);

    if (!props.ifcModel)
        return (<></>);

    async function UpdateItems(event: { target: IFCModel}) {
        const highlighter = Components.highlighter;
        for (const selection in highlighter.selection) {
            if (selection != 'hover' && selection != 'select')
                highlighter.remove(selection)
        }
    
        setItems(items, )

        const ifcModel = event.target;

        var objects: TypeData[] = [];
        const model = ifcModel.object;
    
        for (const child of model.children) {
            if (!(child instanceof FRA.FragmentMesh))
                continue;
    
            const idsIterator = child.fragment.ids.values();
            const id = idsIterator.next();
    
            const properties = await webIFC.properties.getItemProperties(ifcModel.id, id.value);
    
            const index = objects.find(value => {
                if (value.type == properties.type) {
                    const index = value.objects.find(value => value.expressID == properties.expressID)
                    if (index == undefined)
                        value.objects.push(properties)
    
                    value.threeObjects.push(child);
                    return true;
                }
    
                return false;
            });
    
            if (index == undefined) {
                objects.push({ objects: [properties], threeObjects: [child], fragmentIDMap: null, type: properties.type });
            }
        }

        for (const object of objects) {
            var ids: number[] = [];
            object.threeObjects.forEach(threeObject => {
                const fragmentIDS = [...threeObject.fragment.ids];
                ids = ids.concat(fragmentIDS)
            })

            object.fragmentIDMap = model.getFragmentMap(ids);

            const name = webIFC.GetNameFromTypeCode(object.type);
            Components.highlighter.add(name, new THREE.Color(1, 0, 0))
        
            const objectsProperties = object.objects.map(value => {
                return(
                    <ModelFoldouts property={value} ifcModel={ifcModel} key={value.Name.value}></ModelFoldouts>
                );
            });

            setItems((oldItems) => [...oldItems, 
                <Foldout key={name} name={name} header={
                    <>
                        <div style={{marginLeft: 'auto'}}></div>
                        <input type="color" className='color-input' defaultValue={'#ff0000'} onChange={(e)=>{
                            const value = (e.target as HTMLInputElement).value;
                            var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(value);
                            const rgb = {
                                r: parseInt(result[1], 16) / 255,
                                g: parseInt(result[2], 16) / 255,
                                b: parseInt(result[3], 16) / 255
                            };
                            const color = Components.highlighter.colors.get(name);
                            if (color)
                                color.set(rgb.r, rgb.g, rgb.b);
                        }}/>
                        <Button icon='light_off' onClick={(e)=>{
                            const button = e.target as HTMLElement;
                            const isHighlighted = button.innerHTML == 'lightbulb';
                            button.innerHTML = isHighlighted ? 'light_off' : 'lightbulb';
                
                            Components.highlighter.highlightByID(name, isHighlighted ? {} : object.fragmentIDMap, true)
                        }}></Button>
                        <Button icon='visibility' onClick={(e)=> {
                            const button = e.target as HTMLElement;
                            const isVisible = button.innerHTML == 'visibility';
                            button.innerHTML = isVisible ? 'visibility_off' : 'visibility';

                            for (const threeObject of object.threeObjects) {
                                const colorMesh = Components.culler.colorMeshes.get(threeObject.uuid);
                                if (!colorMesh) {
                                    threeObject.visible = !isVisible;
                                    continue;
                                }

                                if (isVisible)
                                    colorMesh.visible = false;
                                else
                                    colorMesh.visible = true;
                            }

                            Components.culler.needsUpdate = true;
                        }}></Button>
                    </>
                }>
                    {objectsProperties}
                </Foldout>
            ])
        }
    }

    return (
        <>
            {items}
        </>
    )
}



