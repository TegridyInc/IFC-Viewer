import * as React from 'react'
import * as FRA from '@thatopen/fragments'
import * as Components from '../Viewer/Components'
import * as THREE from 'three'
import { WindowComponent, FoldoutComponent, FoldoutElementComponent, IconButton, ToggleButton, ColorInput } from '../Utility/UIUtility.component'
import { ModelFoldouts } from '../Utility/IFCUtility'
import {IFCModel} from '../Viewer/IFCModel'
import { Stack } from '@mui/material'
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
        <WindowComponent label='Property Tree' root={propertyTreeRoot} container={propertyTreeContainer} >
            <TypeFoldouts ifcModel={ifcModel}></TypeFoldouts>
        </WindowComponent>
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

            setItems((oldItems) => [...oldItems, <TypeFoldout typeData={object} ifcModel={ifcModel}></TypeFoldout>])
        }
    }

    return (
        <Stack spacing={1}>
            {items}
        </Stack>
    )
}

const TypeFoldout = (props: {typeData: TypeData, ifcModel: IFCModel}) => {
    const [highlighted, setHighlight] = React.useState(false);
    const [visible, setVisibilty] = React.useState(true);

    const name = webIFC.GetNameFromTypeCode(props.typeData.type);

    const mounted = React.useRef(false)
    React.useEffect(()=>{
        if(!mounted.current) {
            mounted.current = true;
            Components.highlighter.add(name, new THREE.Color(1, 0, 0))
        }
    },[])

    const objectsProperties = props.typeData.objects.map(value => {
        return(
            <ModelFoldouts property={value} ifcModel={props.ifcModel} key={value.Name.value}></ModelFoldouts>
        );
    });

    const changeHighlightColor = (e: React.ChangeEvent<HTMLInputElement>)=>{
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
    }

    const toggleHighlight = (e:React.MouseEvent<HTMLElement>)=>{
        setHighlight((oldValue)=>!oldValue);

        const button = e.target as HTMLElement;
        button.innerHTML = !highlighted ? 'lightbulb' : 'light_off'

        Components.highlighter.highlightByID(name, highlighted ? {} : props.typeData.fragmentIDMap, true)
    }

    const toggleVisibility = (e:React.MouseEvent<HTMLElement>)=>{
        setVisibilty((oldValue)=>!oldValue);

        const button = e.target as HTMLElement;
        button.innerHTML = !visible ? 'visibility' : 'visibility_off'

        for (const threeObject of props.typeData.threeObjects) {
            const colorMesh = Components.culler.colorMeshes.get(threeObject.uuid);
            if (!colorMesh) {
                threeObject.visible = !visible;
                continue;
            }

            if (visible)
                colorMesh.visible = false;
            else
                colorMesh.visible = true;
        }

        Components.culler.needsUpdate = true;
    }

    return (
        <FoldoutComponent sx={{border: '1px solid var(--highlight-color)'}} key={name} name={name} header={
            <Stack sx={{marginLeft: 'auto', alignItems: 'center', marginRight: '5px'}} spacing={.5} direction={'row'}>
                <ColorInput type="color" className='color-input' defaultValue={'#ff0000'} onChange={changeHighlightColor}/>
                <ToggleButton value={highlighted} selected={highlighted} onClick={toggleHighlight}>light_off</ToggleButton>
                <ToggleButton value={visible} selected={visible} onClick={toggleVisibility}>visibility</ToggleButton>
            </Stack>
        }>
            {objectsProperties}
        </FoldoutComponent>
    )
}



