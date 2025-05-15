import * as React from 'react'
import * as FRA from '@thatopen/fragments'
import {highlighter, culler} from '../Viewer/Components'
import * as THREE from 'three'
import { WindowComponent, FoldoutComponent, FoldoutElementComponent, IconButton, ToggleButton, ColorInput } from '../Utility/UIUtility.component'
import { ModelFoldouts } from '../Utility/IFCUtility'
import {IFCDispatcher, IFCModel} from '../Viewer/IFC'
import { Stack, Tooltip } from '@mui/material'
/*
*/
      
interface TypeData {
    data: { [attibute: string]: any }[];
    objects: Set<FRA.FragmentMesh>;
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
                e.detail.dispatcher.addEventListener('onPropertyTree', OpenPropertyTree)
            })

            document.addEventListener('onModelRemoved', (e: CustomEvent<IFCModel>) =>{
                setIFCModel(oldIFCModel => oldIFCModel == e.detail ? undefined : oldIFCModel)
                    
                e.detail.dispatcher.removeEventListener('onPropertyTree', OpenPropertyTree)
            })
        }
    }, []);

    return(
        <WindowComponent label='Property Tree' root={propertyTreeRoot} container={propertyTreeContainer} >
            <TypeFoldouts ifcModel={ifcModel}></TypeFoldouts>
        </WindowComponent>
    )

    function OpenPropertyTree(event: { target: IFCDispatcher}) {
        if(ifcModel == event.target.ifc) {
            return;
        }
    
        setIFCModel(event.target.ifc)

        if(propertyTreeContainer.current.parentElement == propertyTreeRoot.current) {
            propertyTreeRoot.current.style.visibility = 'visible';
        }
    }
} 

function TypeFoldouts(props: { ifcModel: IFCModel }) {
    const [items, setItems] = React.useState([]);

    const mounted = React.useRef(false);

    React.useEffect(()=>{
        if(!mounted.current) {
            mounted.current = true;
            
            document.addEventListener('onModelAdded', (e: CustomEvent<IFCModel>) => {
                e.detail.dispatcher.addEventListener('onPropertyTree', UpdateItems)
            })
        }
    }, []);

    if (!props.ifcModel)
        return <></>;

    async function UpdateItems(event: { target: IFCDispatcher}) {
        for (const selection in highlighter.selection) {
            if (selection != 'hover' && selection != 'select')
                highlighter.remove(selection)
        }
    
        setItems([])

        const ifcModel = event.target.ifc;

        var types: TypeData[] = [];
        var idsFound = new Set<number>();

        for (const child of ifcModel.children) {
            if (!(child instanceof FRA.FragmentMesh))
                continue;
        
            for (const id of child.fragment.ids) { 
                const properties = await webIFC.properties.getItemProperties(ifcModel.ifcID, id);
                const index = types.findIndex(value => value.type == properties.type)
    
                if(index == -1) {
                    types.push({ data: [properties], objects: new Set<FRA.FragmentMesh>([child]), fragmentIDMap: null, type: properties.type });
                } else {
                    if(!idsFound.has(id)) {
                        types[index].data.push(properties)
                    }
                    types[index].objects.add(child)
                } 
    
                idsFound.add(id)
            }
        }

        types.forEach(type => {
            var fragmentIds: number[] = [];
            type.objects.forEach(object => {
                const ids = [...object.fragment.ids.values()];
                fragmentIds.push(...ids)
            })

            type.fragmentIDMap = ifcModel.getFragmentMap(fragmentIds)
        })

        setItems(types.map(value => {
            return <TypeFoldout typeData={value} ifcModel={ifcModel}></TypeFoldout>;
        }))
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
    const [isOpen, setOpenState] = React.useState(false);

    const name = webIFC.GetNameFromTypeCode(props.typeData.type);

    const mounted = React.useRef(false)
    React.useEffect(()=>{
        if(!mounted.current) {
            mounted.current = true;
            highlighter.add(name, new THREE.Color(1, 0, 0))
        }
    },[])

    const objectsProperties = props.typeData.data.map(value => {
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
        const color = highlighter.colors.get(name);
        if (color)
            color.set(rgb.r, rgb.g, rgb.b);
    }

    const toggleHighlight = (e:React.MouseEvent<HTMLElement>)=>{
        setHighlight((oldValue)=>!oldValue);

        const button = e.target as HTMLElement;
        button.innerHTML = !highlighted ? 'lightbulb' : 'light_off'

        highlighter.highlightByID(name, highlighted ? {} : props.typeData.fragmentIDMap, true)
    }

    const toggleVisibility = (e:React.MouseEvent<HTMLElement>)=>{
        setVisibilty((oldValue)=>!oldValue);

        const button = e.target as HTMLElement;
        button.innerHTML = !visible ? 'visibility' : 'visibility_off'

        for (const threeObject of props.typeData.objects) {
            const colorMesh = culler.colorMeshes.get(threeObject.uuid);
            if (!colorMesh) {
                threeObject.visible = !visible;
                continue;
            }

            if (visible)
                colorMesh.visible = false;
            else
                colorMesh.visible = true;
        }

        culler.needsUpdate = true;
    }

    return (
        <FoldoutComponent sx={{border: '1px solid var(--highlight-color)'}} onClosed={async ()=> {setOpenState(false)}} onOpen={async ()=> {setOpenState(true)}} key={name} name={name} header={
            <Stack sx={{marginLeft: 'auto', alignItems: 'center', marginRight: '5px'}} spacing={.5} direction={'row'}>
                <Tooltip title='Highlight Color'>
                    <ColorInput type="color" className='color-input' defaultValue={'#ff0000'} onChange={changeHighlightColor}/>
                </Tooltip>
                <Tooltip title='Highlight'>
                    <ToggleButton value={highlighted} selected={highlighted} onClick={toggleHighlight}>light_off</ToggleButton>
                </Tooltip>
                <Tooltip title='Visibility'>
                    <ToggleButton value={visible} selected={visible} onClick={toggleVisibility}>visibility</ToggleButton>
                </Tooltip>
            </Stack>
        }>
            {isOpen ? objectsProperties : <></>}
        </FoldoutComponent>
    )
}



