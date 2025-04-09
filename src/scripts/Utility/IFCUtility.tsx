import * as FRA from '@thatopen/fragments';
import * as THREE from 'three'
import * as React from 'react';
import { Button, Foldout, FoldoutElement } from './UIUtility';
import * as Components from '../Viewer/Components'
import { IFCModel } from '../Viewer/IFCModel'
import { JSX } from 'react/jsx-runtime';



export function CreateBoundingBox(ifcModel: IFCModel, offsetModel?: boolean, color?: THREE.ColorRepresentation) {
    const model = ifcModel.object;

    Components.boundingBoxer.reset();
    Components.boundingBoxer.add(model);
    const box3 = Components.boundingBoxer.get();

    const boxMesh = Components.boundingBoxer.getMesh().clone();
    model.add(boxMesh);
    boxMesh.visible = false;

    if (offsetModel) {
        model.children.forEach(child => {
            if (child instanceof FRA.FragmentMesh)
                child.position.sub(boxMesh.position);
        })

        model.position.set(0, (Math.abs(box3.min.y) + box3.max.y) / 2, 0);
        boxMesh.position.setScalar(0);
    }

    const outline = new THREE.BoxHelper(boxMesh, color ? color : 0xffffff);
    outline.visible = false;
    model.add(outline)

    Components.boundingBoxer.dispose();
    ifcModel.boundingBox = { outline: outline, boxMesh: boxMesh }
}

export async function CreateProperties(modelID: number, propertyID: number, container: HTMLElement) {

    // const property = await webIFC.properties.getItemProperties(modelID, propertyID);
    // const propertyFoldout = UIUtility.Foldout(property.Name.value, container);

    // await CreateAttributesFoldout(property, propertyFoldout.container, modelID)
    // await CreateMaterialFoldout(property, propertyFoldout.container, modelID);
    // await CreatePropertySetsFoldout(property, propertyFoldout.container, modelID);
    // await CreateSpatialElementFoldout(property, propertyFoldout.container, modelID)
}


export function ModelFoldouts(props: {property: { [attribute: string]: any }, ifcModel: IFCModel}) {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <Foldout name={props.property.Name.value} onOpen={async () => { setIsOpen(true) }} onClosed={async () => { setIsOpen(false) }}>
            {!isOpen ? <></> :
                <>  
                    <AttributesFoldout ifcModel={props.ifcModel} property={props.property}></AttributesFoldout>
                    <MaterialFoldout ifcModel={props.ifcModel} property={props.property}></MaterialFoldout>
                    <PropertySetsFoldout ifcModel={props.ifcModel} property={props.property}></PropertySetsFoldout>
                    <SpatialElementFoldout ifcModel={props.ifcModel} property={props.property}></SpatialElementFoldout>
                </>
            }
        </Foldout>
    )
}

function AttributesFoldout(props: { ifcModel:IFCModel, property: { [attribute: string]: any } }) {
    const [attributes, setAttributes] = React.useState(undefined);
    const [isOpen, setIsOpen] = React.useState(false);

    const mounted = React.useRef(false);
    React.useEffect(()=>{
        if(!mounted.current) {
            mounted.current = true;

            const getAttributes = async () =>{
                const objectPlacement = await webIFC.properties.getItemProperties(props.ifcModel.id, props.property.ObjectPlacement.value);
                const relativePlacement = await webIFC.properties.getItemProperties(props.ifcModel.id, objectPlacement.RelativePlacement.value)
                const location = await webIFC.properties.getItemProperties(props.ifcModel.id, relativePlacement.Location.value);
            
                setAttributes(
                    <>
                        <FoldoutElement label='Class' value={webIFC.GetNameFromTypeCode(props.property.type)}></FoldoutElement>
                        <FoldoutElement label='Location' value={"X: " + location.Coordinates['0'].value + " Y: " + location.Coordinates['1'].value + " Z: " + location.Coordinates['2'].value}></FoldoutElement>
                        {props.property.ObjectType ? <FoldoutElement label='Object Type' value={props.property.ObjectType.value}></FoldoutElement> : <></>}
                    </>
                )
            }

            getAttributes();
        }
    }, []);
    
    return (
        <Foldout name='Attributes' onOpen={async ()=>{setIsOpen(true)}} onClosed={async ()=>{setIsOpen(false)}}>
            {!isOpen ? <></> :
                attributes
            }
        </Foldout>
    )
}


function MaterialFoldout(props: { ifcModel:IFCModel, property: { [attribute: string]: any } }) {
    const [materials, setMaterials] = React.useState(undefined);
    const [isOpen, setIsOpen] = React.useState(false);

    const mounted = React.useRef(false);
    const foldoutName = React.useRef('Materials');

    React.useEffect(()=>{
        if(!mounted.current) {
            mounted.current = true;

            const getMaterials = async () =>{
                const id = props.ifcModel.id;
                const materialsProperty = await webIFC.properties.getMaterialsProperties(id, props.property.expressID);
            
                var elements: JSX.Element | JSX.Element[];

                if(!materialsProperty[0]) 
                    return;

                const materialProperty = materialsProperty[0];
                if(materialProperty.ForLayerSet || materialProperty.MaterialLayers) {
                    var layerSet;
                    if (materialProperty.ForLayerSet)
                        layerSet = await webIFC.properties.getItemProperties(id, materialProperty.ForLayerSet.value);
                    else
                        layerSet = materialProperty

                    const materialsLayers = layerSet.MaterialLayers as any[];
                    
                    elements = await Promise.all(materialsLayers.map(async materialLayer => {
                        const layer = await webIFC.properties.getItemProperties(id, materialLayer.value);
                        var material: any;

                        if(layer.Material) {
                            material = await webIFC.properties.getItemProperties(id, layer.Material.value);
                        }

                        foldoutName.current = 'Layers';

                        return (
                            <Foldout name='Layer'>
                                {material ? <FoldoutElement label='Material' value={material.Name.value}></FoldoutElement> : <FoldoutElement label='Material' value='Undefined'></FoldoutElement>}
                                {layer.LayerThickness ? <FoldoutElement label='Layer Thickness' value={layer.LayerThickness.value}></FoldoutElement> : <></>}
                            </Foldout>
                        )
                    }))
                    
                    foldoutName.current = 'Layers';
                } else if (materialProperty.Materials) {
                    const materialsProperty = materialProperty.Materials as any[];
                    elements = await Promise.all(materialsProperty.map(async materialProperty => {
                        const material = await webIFC.properties.getItemProperties(id, materialProperty.value);
                        return <FoldoutElement label={material.Name.value}></FoldoutElement>;
                    }));
                } else {
                    elements = <FoldoutElement label={materialProperty.Name.value}></FoldoutElement>
                }
                

                setMaterials(elements)
            }

            getMaterials();
        }
    }, []);
    
    return (
        <Foldout name={foldoutName.current} onOpen={async()=>{setIsOpen(true)}} onClosed={async ()=>{setIsOpen(false)}}>
            {!isOpen ? <></> :
                materials
            }
        </Foldout>
    )
}

function PropertySetsFoldout(props: { property: { [attribute: string]: any }, ifcModel: IFCModel}) {
    const [propertySets, setPropertySets] = React.useState(undefined);
    const [isOpen, setIsOpen] = React.useState(false)

    const mounted = React.useRef(false);

    React.useEffect(()=>{
        if(!mounted.current) {
            mounted.current = true;

            const getPropertySets = async () => {
                const propertySetsProperty = await webIFC.properties.getPropertySets(props.ifcModel.id, props.property.expressID);

                if (propertySetsProperty.length != 0) {
                    const elements = await Promise.all(propertySetsProperty.map(async propertySet => {
                        const handles = propertySet.HasProperties as any[];
                        
                        var set: any;
                        if(handles) {
                            set = await Promise.all(handles.map(async handle => {
                                const singleValue = await webIFC.properties.getItemProperties(props.ifcModel.id, handle.value);
                                if(!singleValue.NominalValue) 
                                    return <></>
                                else
                                    return <FoldoutElement label={singleValue.Name.value} value={singleValue.NominalValue.value + (singleValue.Unit ? " " + singleValue.Unit.value : "")}></FoldoutElement>
                            }))
                        } 
                        
                        return(
                            <Foldout name={propertySet.Name.value}>
                                {set}
                            </Foldout>
                        )
                    }))

                    setPropertySets(elements);
                }
            }

            getPropertySets();
        }
    }, [])

    return (
        <Foldout name='Property Sets' onOpen={async()=>{setIsOpen(true)}} onClosed={async ()=>{setIsOpen(false)}}>
            {!isOpen ? <></> :
                propertySets
            }
        </Foldout>
    )
}

function SpatialElementFoldout(props: { property: { [attribute: string]: any }, ifcModel: IFCModel }) {
    const [spatialElement, setSpatialElement] = React.useState(undefined);
    const mounted = React.useRef(false);

    React.useEffect(()=>{
        if(!mounted.current) {
            mounted.current = true;
            const getSpatialStructure = async () => {
                const spatialStructure = await webIFC.properties.getSpatialStructure(props.ifcModel.id);
                const spatialElementID = GetSpatialElement(spatialStructure, props.property.expressID);
                const spatialElementProperty = await webIFC.properties.getItemProperties(props.ifcModel.id, spatialElementID);
                
                if (spatialElementProperty) {
                    setSpatialElement(
                        <>
                            <FoldoutElement label={'Name'} value={spatialElementProperty.Name.value}></FoldoutElement>
                            {spatialElementProperty.Elevation ? <FoldoutElement label='Elevation' value={spatialElementProperty.Elevation.value}></FoldoutElement> : <></>}
                        </>
                    )
                }
            }

            getSpatialStructure();
    }}, []);

    return <Foldout name='Spatial Element'>{spatialElement}</Foldout>;
}
    
    
function GetSpatialElement(spatialStructure: any, id: number): number | null {
    if (!spatialStructure.children)
        return null;

    for (const child in spatialStructure.children) {
        if (spatialStructure.children[child].expressID == id)
            return spatialStructure.expressID;
        else {
            const result = GetSpatialElement(spatialStructure.children[child], id);
            if (result)
                return result;

            continue;
        }
    }

    return null; 
}

