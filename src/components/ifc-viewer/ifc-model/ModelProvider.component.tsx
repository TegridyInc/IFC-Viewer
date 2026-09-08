
import {IFCModel} from './IFC'
import { useRef, useState } from 'react';

import {useCallback, createContext, useMemo, useContext } from 'react'

export enum EventType {
    ModelAdded,
    ModelRemoved,
    VisibilityChanged,

    PropertyTreeOpened,
    SpatialStructureOpened,
    PlansOpened,
}


type ModelContextData = {
    models: IFCModel[],
    addModel: (model: IFCModel) => void,
    removeModel: (model: IFCModel) => void,

    addEventListener: (event: EventType, handler: (model: IFCModel) => void) => void,
    invokeEvent: (event: EventType, ifcModel: IFCModel) => void
}

const ModelContext = createContext<ModelContextData>(undefined);

export const ModelProvider = ({children}: any) => {
    const [models, setModels] = useState<IFCModel[]>([]);
    
    const modelEventMapRef = useRef(new Map<EventType, Set<Function>>())

    const addModel = useCallback((model: IFCModel) => {
        setModels((current) => [...current, model]);
        invokeEvent(EventType.ModelAdded, model)
    }, []);

    const removeModel = useCallback((model: IFCModel) => {
        setModels(models.filter(m => m.id !== model.id))
        invokeEvent(EventType.ModelRemoved, model)
    }, [])

    const addEventListener = useCallback((eventType: EventType, handler: (model: IFCModel) => void) => {
        const eventMap = modelEventMapRef.current
        if(eventMap.get(eventType) === undefined)
            eventMap.set(eventType, new Set())

        eventMap.get(eventType).add(handler)

        return () => { 
            eventMap.get(eventType).delete(handler)
        } 
    }, [])

    const invokeEvent = useCallback((eventType: EventType, ifcModel: IFCModel) => {
        const eventMap = modelEventMapRef.current
        
        const handlers = eventMap.get(eventType)
        if(handlers === undefined)
            return

        handlers.forEach(handler => {
            handler(ifcModel)
        })
    }, [])

    const value = useMemo(() => ({
        models,
        addModel,
        removeModel,
        addEventListener,
        invokeEvent
    }), [models, addModel, removeModel, addEventListener, invokeEvent]);

    return (
        <ModelContext.Provider value={value}>
            {children}
        </ModelContext.Provider>
    );
}

export default ModelProvider

export function useModels() {
  const ctx = useContext(ModelContext);
  if (!ctx) throw new Error("useModels must be used inside ModelProvider");
  return ctx;
}