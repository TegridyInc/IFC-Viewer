import * as Components from '../Viewer/Components'
import * as Toolbar from '../Viewer/Toolbar'
import {BigButton, WindowComponent} from '../Utility/UIUtility.component'
import {IFCDispatcher, IFCModel} from '../Viewer/IFC'
import {Stack} from '@mui/material'
import * as React from 'react'

var modelOpen: IFCModel;

export default function Plans() {
    const [plans, setPlans] = React.useState([]);

    const plansRootRef = React.useRef<HTMLDivElement>(undefined);
    const plansContainerRef = React.useRef<HTMLDivElement>(undefined);

    const mounted = React.useRef(false)
    React.useEffect(()=>{
        if(!mounted.current) {
            mounted.current = true;

            document.addEventListener('onModelAdded', (e: CustomEvent<IFCModel>) => {
                const ifcModel = e.detail;
            
                ifcModel.dispatcher.addEventListener('onPlans', OpenPlans)
            })
            
            document.addEventListener('onModelRemoved', (e:CustomEvent<IFCModel>)=>{
                const ifcModel = e.detail;
                if(ifcModel == modelOpen) {
                    setPlans([])
                }
            
                ifcModel.dispatcher.removeEventListener('onPlans', OpenPlans)
            })
        }
    }, [])

    async function OpenPlans(event: {target: IFCDispatcher}) {
        if (plansContainerRef.current.parentElement != plansRootRef.current || event.target.ifc == modelOpen)
            return;
    
        modelOpen = event.target.ifc;
        setPlans([]);
        Components.plans.list = [];
        await Components.plans.generate(event.target.ifc);
    
        const planViewButtons = Components.plans.list.map(planView => {
            return (
                <BigButton onClick={()=>{ Components.plans.goTo(planView.id) }}>{planView.name}</BigButton>
            )
        })

        Toolbar.DisableTool();
        Components.highlighter.enabled = true;
        plansRootRef.current.style.visibility = 'visible';
        setPlans(planViewButtons)
    }

    return (
        <WindowComponent label='Plans' root={plansRootRef} container={plansContainerRef} onClose={()=>{
            Components.highlighter.clear();
            Components.highlighter.enabled = false;
            Toolbar.EnableTool();
            Components.plans.exitPlanView(true)
        }}>
            { plans.length != 0 ? 
              <Stack spacing={.5}>
                {plans}
              </Stack>
                : <></>
            }
        </WindowComponent>
    )
}

