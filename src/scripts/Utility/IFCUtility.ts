import * as FRA from '@thatopen/fragments';
import * as THREE from 'three'
import * as UIUtility from './UIUtility';
import * as Components from '../Viewer/Components'
import * as IFC from '../Viewer/IFCModel'

interface ObjectsData {
    objects: { [attibute: string]: any }[];
    threeObjects: FRA.FragmentMesh[];
    fragmentIDMap: { [attribute: string]: any };
    type: number;
}

export function CreateBoundingBox(ifcModel: IFC.IFCModel, offsetModel?: boolean, color?: THREE.ColorRepresentation) {
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
    ifcModel.boundingBox = {outline: outline, boxMesh: boxMesh}
}

export async function CreateProperties(modelID: number, propertyID: number, container:HTMLElement) {

    const property = await webIFC.properties.getItemProperties(modelID, propertyID);
    const propertyFoldout = UIUtility.CreateFoldout(property.Name.value, container);

    await CreateAttributesFoldout(property, propertyFoldout.container, modelID)
    await CreateMaterialFoldout(property, propertyFoldout.container, modelID);
    await CreatePropertySetsFoldout(property, propertyFoldout.container, modelID);
    await CreateSpatialElementFoldout(property, propertyFoldout.container, modelID)
}

export async function CreateTypeFoldouts(model: FRA.FragmentsGroup, container: HTMLElement, modelID: number) {
    var objects: ObjectsData[] = [];

    container.innerHTML = ''

    const highlighter = Components.highlighter;
    for (const selection in highlighter.selection) {
        if (selection != 'hover' && selection != 'select')
            highlighter.remove(selection)
    }

    for (const child of model.children) {

        if (!(child instanceof FRA.FragmentMesh))
            continue;

        const idsIterator = child.fragment.ids.values();
        const id = idsIterator.next();

        const properties = await webIFC.properties.getItemProperties(modelID, id.value);
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

        if (index == undefined)
            objects.push({ objects: [properties], threeObjects: [child], fragmentIDMap: null, type: properties.type });
    }

    for (const object of objects) {
        const name = webIFC.GetNameFromTypeCode(object.type);
        Components.highlighter.add(name, new THREE.Color(1, 0, 0))

        var ids: number[] = [];
        object.threeObjects.forEach(threeObject => {
            const fragmentIDS = [...threeObject.fragment.ids];
            ids = ids.concat(fragmentIDS)
        })

        object.fragmentIDMap = model.getFragmentMap(ids);

        const data = UIUtility.CreateFoldout(name, container, async () => {
            await CreateModelFoldouts(object.objects, data.container, modelID)
        }, async () => {
            data.container.innerHTML = ''
        });

        const divider = document.createElement('div');
        divider.style.marginLeft = 'auto'
        data.header.append(divider)
        UIUtility.CreateColorInput('#ff0000', data.header, (e) => {
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
        });

        UIUtility.CreateButton('light_off', data.header, (e) => {
            const button = e.target as HTMLElement;
            const isHighlighted = button.innerHTML == 'lightbulb';
            button.innerHTML = isHighlighted ? 'light_off' : 'lightbulb';

            Components.highlighter.highlightByID(name, isHighlighted ? {} : object.fragmentIDMap, true)
        });

        UIUtility.CreateButton('visibility', data.header, (e) => {
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
        });
    }

}

async function CreateModelFoldouts(properties: { [attribute: string]: any }[], container: HTMLElement, modelID: number) {
    for (const property of properties) {
        const modelFoldoutData = UIUtility.CreateFoldout(property.Name.value, container, async () => {
            await CreateAttributesFoldout(property, modelFoldoutData.container, modelID)
            await CreateMaterialFoldout(property, modelFoldoutData.container, modelID);
            await CreatePropertySetsFoldout(property, modelFoldoutData.container, modelID);
            await CreateSpatialElementFoldout(property, modelFoldoutData.container, modelID)
        }, async () => {
            modelFoldoutData.container.innerHTML = ''
        });

    }
}

async function CreateAttributesFoldout(property: { [attribute: string]: any }, container: HTMLElement, modelID: number) {
    const attributesFoldoutData = UIUtility.CreateFoldout('Attributes', container);

    UIUtility.CreateFoldoutElement('Class', webIFC.GetNameFromTypeCode(property.type), attributesFoldoutData.container)

    const objectPlacement = await webIFC.properties.getItemProperties(modelID, property.ObjectPlacement.value);
    const relativePlacement = await webIFC.properties.getItemProperties(modelID, objectPlacement.RelativePlacement.value)
    const location = await webIFC.properties.getItemProperties(modelID, relativePlacement.Location.value);

    UIUtility.CreateFoldoutElement('Location', "X: " + location.Coordinates['0'].value + " Y: " + location.Coordinates['1'].value + " Z: " + location.Coordinates['2'].value, attributesFoldoutData.container);

    if (property.ObjectType)
        UIUtility.CreateFoldoutElement('Object Type', property.ObjectType.value, attributesFoldoutData.container);
}

async function CreateMaterialFoldout(property: { [attribute: string]: any }, container: HTMLElement, modelID: number) {
    const materials = await webIFC.properties.getMaterialsProperties(modelID, property.expressID);
    materials.forEach(async materialProperty => {
        console.log(materialProperty)
        if (materialProperty.ForLayerSet || materialProperty.MaterialLayers) {
            var layerSet;
            if (materialProperty.ForLayerSet)
                layerSet = await webIFC.properties.getItemProperties(modelID, materialProperty.ForLayerSet.value);
            else
                layerSet = materialProperty;

            const layerSetContainerData = UIUtility.CreateFoldout('Layers', container);

            for (const layerHandle in layerSet.MaterialLayers) {
                const layer = await webIFC.properties.getItemProperties(modelID, layerSet.MaterialLayers[layerHandle].value);
                const layerContainerData = UIUtility.CreateFoldout('Layer', layerSetContainerData.container)

                if (layer.LayerThickness)
                    UIUtility.CreateFoldoutElement('Layer Thickness', layer.LayerThickness.value, layerContainerData.container)

                if (layer.Material) {
                    const material = await webIFC.properties.getItemProperties(modelID, layer.Material.value);
                    UIUtility.CreateFoldoutElement('Material', material.Name.value, layerContainerData.container);
                } else {
                    UIUtility.CreateFoldoutElement('Material', 'Undefined', layerContainerData.container)
                }
            }
        } else if (materialProperty.Materials) {
            const materialsContainerData = UIUtility.CreateFoldout('Materials', container)
            for (const materialHandle in materialProperty.Materials) {
                const material = await webIFC.properties.getItemProperties(modelID, materialProperty.Materials[materialHandle].value);
                UIUtility.CreateFoldoutElement(material.Name.value, undefined, materialsContainerData.container);
            }
        }
        else
            UIUtility.CreateFoldoutElement('Material', materialProperty.Name.value, container);
    })
}

async function CreatePropertySetsFoldout(property: { [attribute: string]: any }, container: HTMLElement, modelID: number) {
    const propertySets = await webIFC.properties.getPropertySets(modelID, property.expressID);
    if (propertySets.length != 0) {
        const propertySetsContainerData = UIUtility.CreateFoldout('Property Sets', container);
        propertySets.forEach(async propertySet => {
            const propertySetFoldoutData = UIUtility.CreateFoldout(propertySet.Name.value, propertySetsContainerData.container);
            for (const Handle in propertySet.HasProperties) {
                const singleValue = await webIFC.properties.getItemProperties(modelID, propertySet.HasProperties[Handle].value);
                if (!singleValue.NominalValue)
                    return;

                UIUtility.CreateFoldoutElement(singleValue.Name.value, singleValue.NominalValue.value + (singleValue.Unit ? " " + singleValue.Unit.value : ""), propertySetFoldoutData.container);
            }
        })
    }
}

async function CreateSpatialElementFoldout(property: { [attribute: string]: any }, container: HTMLElement, modelID: number) {
    const spatialStructure = await webIFC.properties.getSpatialStructure(modelID);
    const spatialElementID = GetSpatialElement(spatialStructure, property.expressID);
    const spatialElement = await webIFC.properties.getItemProperties(modelID, spatialElementID);

    if (spatialElement) {
        const spatialElementContainerData = UIUtility.CreateFoldout('Spatial Element', container);
        UIUtility.CreateFoldoutElement('Name', spatialElement.Name.value, spatialElementContainerData.container);

        if (spatialElement.Elevation)
            UIUtility.CreateFoldoutElement('Elevation', spatialElement.Elevation.value, spatialElementContainerData.container)
    }
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

