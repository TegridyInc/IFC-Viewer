import * as FRA from '@thatopen/fragments'
import { world, fragmentManager, worlds } from '../Components'
import {IconButton, ToggleButton} from '../inputs/Buttons';
import { LoadIFCModel } from './IFCLoader' 
import {IFCGroup, IFCModel} from './IFC'
import { useRef, useState, FormEvent, useEffect, MouseEvent } from 'react';
import { JSX } from 'react/jsx-runtime';
import { styled, Stack, Tooltip } from '@mui/material'
import Foldout from '@pim_platform/components/ifc-viewer/foldout/Foldout.component'
import FoldoutElement from '@pim_platform/components/ifc-viewer/foldout/FoldoutElement.component'

import Window from '@pim_platform/components/ifc-viewer/window/Window.component'
import { EventType, useModels } from './ModelProvider.component';

const ModelManager = styled(Window)({
    alignContent: 'center',
    paddingLeft: '5px'
})

const ModelManagerComponent = () => {
    const rootRef = useRef<HTMLDivElement>(undefined);
    const containerRef = useRef<HTMLDivElement>(undefined);
   
    const { models } = useModels()

    const mounted = useRef(false);
    useEffect(()=>{
        if(!mounted.current) {
            mounted.current = true;

            document.getElementById('open-model-manager').addEventListener('click', ()=>{
                if(containerRef.current.parentElement == rootRef.current) 
                    rootRef.current.style.visibility = 'visible';
            })
        }
    }, [])
    
    return (
        <ModelManager label='Model Manager' root={rootRef} container={containerRef}>
            {
                <Stack spacing={1}>
                    {
                        models.map(model => <ModelItemComponent ifcModel={model}/>)
                    } 
                </Stack> 
            }
        </ModelManager>
    )
}

export default ModelManagerComponent;

const ModelItemComponent = (props: {ifcModel: IFCModel})=>{
    const ifcModel = props.ifcModel;

    const [visible, setVisibilty] = useState(true);
    const [generalIFCData, setGeneralIFCData] = useState(undefined);

    const { removeModel, invokeEvent } = useModels()

    const openSpatialStructure = () => invokeEvent(EventType.SpatialStructureOpened, ifcModel)

    const openPropertyTree = ()=> invokeEvent(EventType.PropertyTreeOpened, ifcModel)

    const toggleVisibility = (e:MouseEvent<HTMLElement>)=>{
        if(!props.ifcModel.group.visible)
            return;

        setVisibilty((oldValue) => !oldValue)
        const button = e.target as HTMLElement;
        button.innerHTML = !visible ? 'visibility' : 'visibility_off'; 

        ifcModel.visible = !visible;
        invokeEvent(EventType.VisibilityChanged, ifcModel)
    }

    const openPlans = () => invokeEvent(EventType.PlansOpened, ifcModel)

    const deleteModel = ()=>{        
        webIFC.CloseModel(ifcModel.ifcID);

        world.scene.three.remove(ifcModel)
        fragmentManager.disposeGroup(ifcModel);
        ifcModel.children.forEach(child=> {
            if(child instanceof FRA.FragmentMesh)
                world.meshes.delete(child);
        })

        ifcModel.dispose();

        removeModel(ifcModel)
    }

    const getGeneralIFCData = async () => {
        const elements: any[] = [];
        
        const applicationDatas = await props.ifcModel.getAllPropertiesOfType(639542469);
        var applicationData: any;
        for(const id in applicationDatas) {
            applicationData = applicationDatas[id];
            break;
        }

        elements.push(
            <Foldout label='Application'>
                <FoldoutElement label='Name' value={applicationData.ApplicationFullName.value}/>
                <FoldoutElement label='Identifier' value={applicationData.ApplicationIdentifier.value}/>
                <FoldoutElement label='Version' value={applicationData.Version.value}/>
            </Foldout>
        )

        const organizationElements: any[] = [];
        const organizationDatas = await props.ifcModel.getAllPropertiesOfType(4251960020);
        for(const id in organizationDatas) {
            const organizationData = organizationDatas[id];

            organizationElements.push(
                <Foldout label={organizationData.Name.value}>
                    <FoldoutElement label='Description' value={organizationData.Description != null ? organizationData.Description.value : ''}/>
                </Foldout>
            )
        }
        
        elements.push(
            <Foldout label='Organizations'>
                {organizationElements}
            </Foldout>
        )

        const classificationElements: any[] = [];
        const classificationsData = await props.ifcModel.getAllPropertiesOfType(747523909);

        for(const id in classificationsData) {
            const classificationData = classificationsData[id] as any;
            classificationElements.push(
                <Foldout label={classificationData.Name.value}>
                    <FoldoutElement label='Edition' value={classificationData.Edition.value}/>
                    <FoldoutElement label='Source' value={classificationData.Source.value}/>
                </Foldout>
            )
        }

        elements.push(
            <Foldout label='Classifications'>
                {classificationElements}
            </Foldout>
        )
        
        setGeneralIFCData(elements);
    }

    const mounted = useRef(false);
    useEffect(()=>{
        if(!mounted.current) {
            mounted.current = true;

            getGeneralIFCData();
        }
    }, [])

    return(
        <Foldout label={ifcModel.name} key={props.ifcModel.ifcID} header={
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
        }>  
            <Foldout label='General'>
                <FoldoutElement label='Description' value={props.ifcModel.ifcMetadata.description}/>
                <FoldoutElement label='Schema' value={props.ifcModel.ifcMetadata.schema}/>
            </Foldout>
            {generalIFCData}
        </Foldout>
    )
}

const groupStates = new Map<string, boolean[]>();

const ModelGroupComponent = (props: {children: JSX.Element|JSX.Element[], group: IFCGroup}) => {
    const [visible, setVisibilty] = useState(true);
    const { invokeEvent } = useModels()

    const addModelToGroup = (e: FormEvent<HTMLInputElement>, group:IFCGroup)=>{
        const file = e.currentTarget.files[0];
        if (!file)
            return;

        const reader = new FileReader();
        reader.onload = () => {
            groupStates.set(group.uuid, [...groupStates.get(group.uuid), true])
            
            LoadIFCModel(reader.result as ArrayBuffer, file.name.split(".ifc")[0], false, group);
        }

        reader.readAsArrayBuffer(file);
    }


    const toggleVisibility = (e:MouseEvent<HTMLElement>)=>{
        setVisibilty((oldValue) => !oldValue)

        if(!visible) {
            const states = groupStates.get(props.group.uuid);
            props.group.ifcModels.forEach((ifcModel, i) => {
                ifcModel.visible = states[i];
                invokeEvent(EventType.VisibilityChanged, ifcModel)
            })
        } else {
            groupStates.set(props.group.uuid, props.group.ifcModels.map(ifcModel => {
                return ifcModel.visible;
            }))

            props.group.ifcModels.forEach(ifcModel => {
                ifcModel.visible = false;
                invokeEvent(EventType.VisibilityChanged, ifcModel)
            })
        }

        props.group.visible = !props.group.visible;
    }

    const focusGroup = () => {
        world.camera.controls.fitToBox(props.group.boundingBox.boxMesh, true, {paddingBottom: 5, paddingTop: 5, paddingLeft: 5, paddingRight: 5});   
    }

    return (
        <Foldout sx={{border: '1px solid', borderColor: 'secondary.light'}} addRightPadding label='New Group' inputLabel key={props.group.uuid} header={
                <Stack sx={{alignItems: 'center'}} spacing={.5} direction={'row'}>
                    <Tooltip title='Toggle Group Visibility'>
                        <ToggleButton value={visible} selected={visible} onClick={toggleVisibility}>
                            {visible ? 'visibility' : 'visibility_off'}
                        </ToggleButton>
                    </Tooltip>
                    <Tooltip title='Focus Group'>
                        <IconButton onClick={focusGroup}>
                            view_in_ar
                        </IconButton>
                    </Tooltip>
                    <Tooltip title='Add Model'>
                        <IconButton>
                            add
                            <label style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'}}>
                                <input type="file" onChange={(event)=>{addModelToGroup(event, props.group)}} accept=".ifc" hidden />
                            </label>
                        </IconButton>
                    </Tooltip>
                </Stack>
            }> 
                {props.children}
        </Foldout>
    )
}
