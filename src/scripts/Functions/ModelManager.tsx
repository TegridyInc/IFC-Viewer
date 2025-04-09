import * as FRA from '@thatopen/fragments'

import * as Components from '../Viewer/Components'
import {Button, Window} from '../Utility/UIUtility';
import {IFCModel} from '../Viewer/IFCModel'
import * as React from 'react';
import { JSX } from 'react/jsx-runtime';

export default function ModelManager(props: {window: React.RefObject<HTMLDivElement>}) {
    const [items, setItems] = React.useState<JSX.Element[]>([]);

    const mounted = React.useRef(false);
    React.useEffect(()=>{
        if(!mounted.current) {
            mounted.current = true;
            document.addEventListener('onModelAdded', (e:CustomEvent<IFCModel>) => AddModelToManager(e.detail))
        }
    }, [])
    
    function AddModelToManager(ifcModel: IFCModel) {
        const model = ifcModel.object;
        const boundingBox = ifcModel.boundingBox;

        const item = (
            <div className='model-item' key={ifcModel.object.name}>
                <div className='model-name'>{ifcModel.object.name}</div>
                <input type="color" className='color-input' defaultValue={'#ffffff'} onChange={(e) => {
                    const value = e.target.value;
                    const hex = '0x' + value.split('#')[1]

                    boundingBox.outline.material.color.setHex(parseInt(hex));
                }}/>
                <Button icon='stacks' onClick={() => {
                    ifcModel.dispatchEvent({type: 'onPlans'})
                }}></Button>
                <Button icon='list' onClick={ ()=>{
                    ifcModel.dispatchEvent({type: 'onPropertyTree'})
                }}></Button>
                <Button icon='visibility' onClick={(e)=> {
                    const button = e.target as HTMLElement;
                    model.visible = !model.visible
                    button.innerHTML = model.visible ? 'visibility' : 'visibility_off';

                    ifcModel.dispatchEvent({type: 'onVisibilityChanged', isVisible: model.visible});
                }}></Button>
                <Button icon='delete' onClick={()=>{
                    globalThis.onModelRemoved = new CustomEvent<IFCModel>('onModelRemoved', { detail: ifcModel });
                    document.dispatchEvent(global.onModelRemoved);
                    
                    webIFC.CloseModel(ifcModel.id);
        
                    Components.world.scene.three.remove(model)
                    Components.fragmentManager.disposeGroup(ifcModel.object);
                    ifcModel.object.children.forEach(child=> {
                        if(child instanceof FRA.FragmentMesh)
                            Components.world.meshes.delete(child);
                    })

                    setItems((oldItems)=>oldItems.filter(value => {
                        return value.key != item.key
                    }))
                    
                    model.dispose();
                }}></Button>
            </div>
        );

        setItems((oldItems)=>[...oldItems, item])
    }
    
    return (
        <Window label='Model Manager' root={props.window}>
            {items}
        </Window>
    )
}