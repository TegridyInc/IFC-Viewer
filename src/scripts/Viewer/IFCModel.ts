import * as THREE from 'three'
import * as FRA from '@thatopen/fragments'

interface Dispatcher {
    onVisibilityChanged:{ isVisible: boolean }
    onPlans: {}
    onPropertyTree:{}
    
    onModelMoveStart:{}
    onModelMove:{}
    onModelMoveEnd:{}
    onModelSelected:{}
}

export interface BoundingBoxData {
    outline: THREE.BoxHelper;
    boxMesh: THREE.Mesh;
}

export class IFCModel extends THREE.EventDispatcher<Dispatcher> {
    object: FRA.FragmentsGroup;
    boundingBox: BoundingBoxData;
    id:number;
}