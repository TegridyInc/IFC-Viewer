import * as FRA from '@thatopen/fragments'

import * as Components from '../Viewer/Components'
import {IconButton, WindowComponent, ColorInput, ToggleButton, FoldoutComponent} from '../Utility/UIUtility.component';
import { LoadIFCModel } from '../Viewer/IFCLoader' 
import {IFCGroup, IFCModel} from '../Viewer/IFC'
import * as React from 'react';
import { JSX } from 'react/jsx-runtime';
import { styled, Stack, Tooltip } from '@mui/material'
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

const ModelManagerComponent = () => {
    const rootRef = React.useRef<HTMLDivElement>(undefined);
    const containerRef = React.useRef<HTMLDivElement>(undefined);
    const [items, setItems] = React.useState<JSX.Element[]>([]);

    const addModelToGroup = (e: React.FormEvent<HTMLInputElement>, group:IFCGroup)=>{
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
                        const children = v.props.children as any[];
                        const index = children.findIndex((v)=> v.props.ifcModel.ifcID == e.detail.ifcID)
                        
                        if(index == -1)
                            children.push( <ModelItemComponent ifcModel={e.detail}></ModelItemComponent> );
                        
                        const modelGroup = (
                            <FoldoutComponent sx={{border: '1px solid var(--highlight-color)'}} name={v.props.name} inputLabel key={v.key} header={
                                <Tooltip title='Add Model'>
                                    <IconButton>
                                        add
                                        <label style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'}}>
                                            <input type="file" onChange={(event)=>{addModelToGroup(event, e.detail.group)}} accept=".ifc" hidden />
                                        </label>
                                    </IconButton>
                                </Tooltip>
                            }>
                                {children}
                            </FoldoutComponent>
                        )

                        return modelGroup
                    }
                })
            } else {
                const modelGroup = (
                    <FoldoutComponent sx={{border: '1px solid var(--highlight-color)'}} name='New Group' inputLabel key={e.detail.group.id} header={
                        <Tooltip title='Add Model'>
                            <IconButton>
                                add
                                <label style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'}}>
                                    <input type="file" onChange={(event)=>{addModelToGroup(event, e.detail.group)}} accept=".ifc" hidden />
                                </label>
                            </IconButton>
                        </Tooltip>
                    }> 
                        {[<ModelItemComponent ifcModel={e.detail}></ModelItemComponent>]}
                    </FoldoutComponent>
                )

                return [...oldItems, modelGroup]
            }
        })
    }

    const removeModel = (e:CustomEvent<IFCModel>) => {
        if(e.detail.group.children.length == 3) {
            e.detail.group.clear();
            Components.world.scene.three.remove(e.detail.group);
        } 

        const index = e.detail.group.ifcModels.findIndex((v)=>v.ifcID == e.detail.ifcID)
        if(index != -1) {
            e.detail.group.ifcModels.splice(index, 1)
        }
        e.detail.group.remove(e.detail);
        
        if(e.detail.group.ifcModels.length > 0)
            e.detail.group.recaculateBoundingBox();

        setItems((oldItems)=>{
            var index = oldItems.findIndex((v) => v.key == e.detail.group.id.toString())

            if(!oldItems[index].props.children.length || oldItems[index].props.children.length == 1) {
                return oldItems.filter((v, i) => i != index)
            } else {
                const children = oldItems[index].props.children;
                const newChildren = children.filter((v:any) => v.props.ifcModel.ifcID != e.detail.ifcID.toString())
                
                return oldItems.map((v, i) => {
                    if(i != index)
                        return v;
                    else {
                        const modelGroup = (
                            <FoldoutComponent sx={{border: '1px solid var(--highlight-color)'}} name={v.props.name} key={v.key} header={
                                <Tooltip title='Add Model'>
                                    <IconButton>
                                        add
                                        <label style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'}}>
                                            <input type="file" onChange={(event)=>{addModelToGroup(event, e.detail.group)}} accept=".ifc" hidden />
                                        </label>
                                    </IconButton>
                                </Tooltip>
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
            
            document.getElementById('open-model-manager').addEventListener('click', ()=>{
                if(containerRef.current.parentElement == rootRef.current) 
                    rootRef.current.style.visibility = 'visible';
            })
        }
    }, [])
    
    return (
        <ModelManager label='Model Manager' root={rootRef} container={containerRef}>
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
    const model = ifcModel;

    const [visible, setVisibilty] = React.useState(true);

    const openSpatialStructure = () => ifcModel.dispatcher.dispatchEvent({type: 'onSpatialStructure'})

    const openPropertyTree = ()=> ifcModel.dispatcher.dispatchEvent({type: 'onPropertyTree'}) 

    const toggleVisibility = (e:React.MouseEvent<HTMLElement>)=>{
        setVisibilty((oldValue) => !oldValue)
        const button = e.target as HTMLElement;
        button.innerHTML = !visible ? 'visibility' : 'visibility_off'; 

        props.ifcModel.visible = !visible;
        ifcModel.dispatcher.dispatchEvent({type: 'onVisibilityChanged', isVisible: !visible});
    }

    const openPlans = ()=> ifcModel.dispatcher.dispatchEvent({type: 'onPlans'}) 

    const deleteModel = ()=>{
        globalThis.onModelRemoved = new CustomEvent<IFCModel>('onModelRemoved', { detail: ifcModel });
        document.dispatchEvent(global.onModelRemoved);
        
        webIFC.CloseModel(ifcModel.ifcID);

        Components.world.scene.three.remove(model)
        Components.fragmentManager.disposeGroup(ifcModel);
        ifcModel.children.forEach(child=> {
            if(child instanceof FRA.FragmentMesh)
                Components.world.meshes.delete(child);
        })

        model.dispose();
    }

    return(
        <ModelItem key={props.ifcModel.ifcID}>
            <ModelName>{ifcModel.name}</ModelName>
            <Stack sx={{alignItems: 'center'}} spacing={.5} direction={'row'}>
                <Tooltip title='Spatial Structure'>
                    <IconButton onClick={openSpatialStructure}>package_2</IconButton>
                </Tooltip>
                <Tooltip title='Floor Plans'>
                    <IconButton onClick={openPlans}>stacks</IconButton>
                </Tooltip>
                <Tooltip title='Property Tree'>
                    <IconButton onClick={openPropertyTree}>list</IconButton>
                </Tooltip>
                <Tooltip title='Visibility'>
                    <ToggleButton size='small' value={visible} selected={visible} color='primary' onChange={toggleVisibility}>visibility</ToggleButton>
                </Tooltip>
                <Tooltip title='Delete'>
                    <IconButton onClick={deleteModel}>delete</IconButton>
                </Tooltip>
            </Stack>
        </ModelItem>
    )
}


