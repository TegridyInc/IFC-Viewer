import * as Components from '../Viewer/Components'
import * as Toolbar from '../Viewer/Toolbar'
import {BigButton, Window} from '../Utility/UIUtility'
import {IFCModel} from '../Viewer/IFCModel'
import * as React from 'react'

var modelOpen: IFCModel;

export default function Plans() {
    const [plans, setPlans] = React.useState(undefined);

    const plansRootRef = React.useRef<HTMLDivElement>(undefined);
    const plansContainerRef = React.useRef<HTMLDivElement>(undefined);

    const mounted = React.useRef(false)
    React.useEffect(()=>{
        if(!mounted.current) {
            mounted.current = true;

            document.addEventListener('onModelAdded', (e: CustomEvent<IFCModel>) => {
                const ifcModel = e.detail;
            
                ifcModel.addEventListener('onPlans', OpenPlans)
            })
            
            document.addEventListener('onModelRemoved', (e:CustomEvent<IFCModel>)=>{
                const ifcModel = e.detail;
                if(ifcModel == modelOpen) {
                    setPlans([])
                }
            
                ifcModel.removeEventListener('onPlans', OpenPlans)
            })
        }
    }, [])

    async function OpenPlans(event: {target: IFCModel}) {
        if (plansContainerRef.current.parentElement != plansRootRef.current || event.target == modelOpen)
            return;
    
        modelOpen = event.target;
        setPlans([]);
        Components.plans.list = [];
        await Components.plans.generate(event.target.object);
    
        const planViewButtons = Components.plans.list.map(planView => {
            return (
                <BigButton label={planView.name} onClick={()=>{
                    Components.plans.goTo(planView.id)
                }}></BigButton>
            )
        })

        Components.highlighter.enabled = true;
        plansRootRef.current.style.visibility = 'visible';
        setPlans(planViewButtons)
    }

    return (
        <Window label='Plans' root={plansRootRef} container={plansContainerRef} onClose={()=>{
            Components.highlighter.clear();
            Components.highlighter.enabled = false;
            //Toolbar.EnableTool();
            Components.plans.exitPlanView(true)
        }}>
            {plans}
        </Window>
    )
}

