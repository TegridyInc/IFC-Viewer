import { DisableCustomView, EnableCustomView } from '../Viewer'
import { plans, highlighter, classifier, edges, world, fragmentManager, grid } from '../Components'
import { DisableTool, EnableTool } from '../Toolbar'
import { Notification } from '../notification/Notifications.component'
import { BigButton } from '../inputs/Buttons'
import Window from '@pim_platform/components/ifc-viewer/window/Window.component'
import { IFCDispatcher, IFCModel } from '@pim_platform/components/ifc-viewer/ifc-model/IFC'
import { EventType, useModels } from '../ifc-model/ModelProvider.component'
import { useState, useRef, useEffect } from 'react'
import { Stack } from '@mui/material'
import * as THREE from 'three'


const grayFill = new THREE.MeshBasicMaterial({ color: "gray", side: 2 });
const blackLine = new THREE.LineBasicMaterial({ color: "black" });
const blackOutline = new THREE.MeshBasicMaterial({
  color: "black",
  opacity: 0.5,
  side: 2,
  transparent: true,
});

export const PlansComponent = () => {
    const [plansList, setPlans] = useState([]);

    const { addEventListener } = useModels()

    const [currentModel, setCurrentModel] = useState<IFCModel>(undefined);

    const plansRootRef = useRef<HTMLDivElement>(undefined);
    const plansContainerRef = useRef<HTMLDivElement>(undefined);

    const mounted = useRef(false)
    useEffect(() => {
        if (!mounted.current) {
            mounted.current = true;

            addEventListener(EventType.PlansOpened, (model) => {
                if(currentModel != model)
                    setCurrentModel(model)
            })
            addEventListener(EventType.ModelRemoved, (model) => {
                if(model == currentModel) {
                    setCurrentModel(undefined)
                }
            })
        }
    }, [])

    async function OpenPlans() {
        if(plansContainerRef.current.parentElement == plansRootRef.current) 
            plansRootRef.current.style.visibility = 'visible';
        
        plans.list = [];
        try {
            await plans.generate(currentModel);
        } catch {
            new Notification('No Plans Found', 'warning')
            return;
        }
        
        if(plans.list.length == 0)
            return;
        
        setPlans([]);
        setCurrentModel(currentModel)
        const planViewButtons = plans.list.map(planView => {
            return (
                <BigButton onClick={() => { plans.goTo(planView.id) }}>{planView.name}</BigButton>
            )
        })
        setPlans(planViewButtons);
        
        classifier.byModel(currentModel.uuid, currentModel);
        classifier.byEntity(currentModel);
        
        const white = new THREE.Color(1,1,1);
        const modelItems = classifier.find({ models: [currentModel.uuid] });
        classifier.setColor(modelItems, white)
        world.scene.three.background = white;
        highlighter.backupColor = white;
        
        const thickItems = classifier.find({
            entities: ["IFCWALLSTANDARDCASE", "IFCWALL", "IFCBUILDINGELEMENTPART", "IFCBUILDINGELEMENTPROXY"],
        });
        
        const thinItems = classifier.find({
            entities: ["IFCDOOR", "IFCWINDOW", "IFCPLATE", "IFCMEMBER"],
        });
        
        edges.styles.create(
            "thick",
            new Set(),
            world,
            blackLine,
            grayFill,
            blackOutline,
        );

        for (const fragID in thickItems) {
            const foundFrag = fragmentManager.list.get(fragID);
            if (!foundFrag) continue;
            const { mesh } = foundFrag;
            
            if(!(mesh.geometry as any).boundsTree)
                continue;
            
            edges.styles.list.thick.fragments[fragID] = new Set(thickItems[fragID]);
            edges.styles.list.thick.meshes.add(mesh);
        }
        
        edges.styles.create("thin", new Set(), world);

        for (const fragID in thinItems) {
            const foundFrag = fragmentManager.list.get(fragID);
            if (!foundFrag) continue;
            const { mesh } = foundFrag;

            if(!(mesh.geometry as any).boundsTree)
                continue;

            edges.styles.list.thin.fragments[fragID] = new Set(thinItems[fragID]);
            edges.styles.list.thin.meshes.add(mesh);
        }
        
        await edges.update();
        
        DisableTool();
        highlighter.enabled = true;
        
        EnableCustomView('Plans');
        plans.goTo(plans.list[0].id);
    }

    async function ExitPlans() {
        highlighter.clear();
        highlighter.enabled = false;

        plans.exitPlanView(false)

        EnableTool();
        DisableCustomView();
        
        highlighter.backupColor = null;

        if(currentModel) {
            classifier.resetColor(currentModel.getFragmentMap());
            setCurrentModel(undefined)
        }
        
        world.scene.three.background = new THREE.Color(.05, .05, .05);
    }

    useEffect(()=> {
        if(currentModel == undefined) {
            setPlans([])
            return
        }

        OpenPlans()
    }, [currentModel])


    return (
        <Window label='Plans' root={plansRootRef} container={plansContainerRef} onClose={ExitPlans}>
            {plansList.length != 0 ?
                <Stack spacing={.5}>
                    {plansList}
                </Stack>
                : <></>
            }
        </Window>
    )
}

export default PlansComponent;