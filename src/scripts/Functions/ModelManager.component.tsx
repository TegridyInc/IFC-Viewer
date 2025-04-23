import * as FRA from '@thatopen/fragments'

import * as Components from '../Viewer/Components'
import {IconButton, WindowComponent, ColorInput, ToggleButton, FoldoutComponent} from '../Utility/UIUtility.component';
import { LoadIFCModel } from '../Viewer/IFCLoader' 
import {IFCModel} from '../Viewer/IFCModel'
import * as React from 'react';
import { JSX } from 'react/jsx-runtime';
import { styled, Stack } from '@mui/material'
import * as THREE from 'three';

const ModelManager = styled(WindowComponent)({
    alignContent: 'center',
    paddingLeft: '5px'
})

const ModelItem = styled('div')({
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'row',
    padding: '5px',
    backgroundColor: 'var(--secondary-color)',
    borderRadius: '5px',
})

const ModelName = styled('div')({
    maxWidth: '300px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    alignContent: 'center',
    paddingLeft: '5px',
    marginRight: 'auto',
})

const ModelManagerComponent = (props: {window: React.RefObject<HTMLDivElement>}) => {
    const [items, setItems] = React.useState<JSX.Element[]>([]);

    const addModelToGroup = (e: React.FormEvent<HTMLInputElement>, group:THREE.Group)=>{
        const file = e.currentTarget.files[0];
            if (!file)
                return;
    
            const reader = new FileReader();
            reader.onload = () => {
                const data = new Uint8Array(reader.result as ArrayBuffer);
                LoadIFCModel(data, file.name.split(".ifc")[0], false, group);
            }
    
            reader.readAsArrayBuffer(file);
    }

    const addModel = (e:CustomEvent<IFCModel>) => {
        setItems((oldItems)=>{
            var index = oldItems.findIndex((v) => v.key == e.detail.group.id.toString())

            if(index != -1) {                    
                return oldItems.map((v, i) =>{
                    if(i != index)
                        return v;
                    else {
                        const modelGroup = (
                            <FoldoutComponent sx={{border: '1px solid var(--highlight-color)'}} name={v.props.name} key={v.key} header={
                                <IconButton>
                                    add
                                    <label style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'}}>
                                        <input type="file" onChange={(event)=>{addModelToGroup(event, e.detail.group)}} accept=".ifc" hidden />
                                    </label>
                                </IconButton>
                            }>
                                {oldItems[index].props.children} 
                                <ModelItemComponent ifcModel={e.detail}></ModelItemComponent>
                            </FoldoutComponent>
                        )

                        return modelGroup
                    }
                })
            } else {
                const modelGroup = (
                    <FoldoutComponent sx={{border: '1px solid var(--highlight-color)'}} name='New Group' key={e.detail.group.id} header={
                        <IconButton>
                            add
                            <label style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'}}>
                                <input type="file" onChange={(event)=>{addModelToGroup(event, e.detail.group)}} accept=".ifc" hidden />
                            </label>
                        </IconButton>
                    }> 
                        <ModelItemComponent ifcModel={e.detail}></ModelItemComponent>
                    </FoldoutComponent>
                )

                return [...oldItems, modelGroup]
            }
        })
    }

    const removeModel = (e:CustomEvent<IFCModel>) => {
        setItems((oldItems)=>{
            var index = oldItems.findIndex((v) => v.key == e.detail.group.id.toString())
            console.log(index)

            if(!oldItems[index].props.children.length || oldItems[index].props.children.length == 1) {
                return oldItems.filter((v, i) => i != index)
            } else {
                const children = oldItems[index].props.children;
                const newChildren = children.filter((v:any) => v.props.ifcModel.id != e.detail.id.toString())

                return oldItems.map((v, i) => {
                    if(i != index)
                        return v;
                    else {
                        const modelGroup = (
                            <FoldoutComponent sx={{border: '1px solid var(--highlight-color)'}} name={v.props.name} key={v.key} header={
                                <IconButton>
                                    add
                                    <label style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'}}>
                                        <input type="file" onChange={(event)=>{addModelToGroup(event, e.detail.group)}} accept=".ifc" hidden />
                                    </label>
                                </IconButton>
                            }> 
                                {newChildren}
                            </FoldoutComponent>
                        )

                        return modelGroup;
                    }
                })
            }
        })
    }

    const mounted = React.useRef(false);
    React.useEffect(()=>{
        if(!mounted.current) {
            mounted.current = true;
            document.addEventListener('onModelAdded', addModel)

            document.addEventListener('onModelRemoved', removeModel)
        }
    }, [])
    
    return (
        <ModelManager label='Model Manager' root={props.window}>
            {
                items.length != 0 ?
                <Stack spacing={1}>
                    {items} 
                </Stack> 
                : <></>
            }
        </ModelManager>
    )
}

export default ModelManagerComponent;


const ModelItemComponent = (props: {ifcModel: IFCModel})=>{
    const ifcModel = props.ifcModel;
    const model = ifcModel.object;
    const boundingBox = ifcModel.boundingBox;

    const [visible, setVisibilty] = React.useState(true);

    const changeBoundingBoxColor = (e: React.ChangeEvent<HTMLInputElement>)=>{
        const value = e.target.value;
        const hex = '0x' + value.split('#')[1]

        boundingBox.outline.material.color.setHex(parseInt(hex));
    }

    const openPropertyTree = ()=> ifcModel.dispatchEvent({type: 'onPropertyTree'}) 

    const toggleVisibility = (e:React.MouseEvent<HTMLElement>)=>{
        setVisibilty((oldValue) => !oldValue)
        const button = e.target as HTMLElement;
        button.innerHTML = !visible ? 'visibility' : 'visibility_off'; 

        props.ifcModel.object.visible = !visible;
        ifcModel.dispatchEvent({type: 'onVisibilityChanged', isVisible: !visible});
    }

    const openPlans = ()=> ifcModel.dispatchEvent({type: 'onPlans'}) 

    const deleteModel = ()=>{
        globalThis.onModelRemoved = new CustomEvent<IFCModel>('onModelRemoved', { detail: ifcModel });
        document.dispatchEvent(global.onModelRemoved);
        
        webIFC.CloseModel(ifcModel.id);

        Components.world.scene.three.remove(model)
        Components.fragmentManager.disposeGroup(ifcModel.object);
        ifcModel.object.children.forEach(child=> {
            if(child instanceof FRA.FragmentMesh)
                Components.world.meshes.delete(child);
        })

        model.dispose();
    }

    return(
        <ModelItem key={props.ifcModel.id}>
            <ModelName>{ifcModel.object.name}</ModelName>
            <Stack sx={{alignItems: 'center'}} spacing={.5} direction={'row'}>
                <ColorInput type='color' defaultValue={'#ffffff'} onChange={changeBoundingBoxColor}/>
                <IconButton onClick={openPlans}>stacks</IconButton>
                <IconButton onClick={openPropertyTree}>list</IconButton>
                <ToggleButton size='small' value={visible} selected={visible} color='primary' onChange={toggleVisibility}>visibility</ToggleButton>
                <IconButton onClick={deleteModel}>delete</IconButton>
            </Stack>
        </ModelItem>
    )
}


