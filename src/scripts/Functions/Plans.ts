import * as Components from '../Viewer/Components'
import * as Toolbar from '../Viewer/Toolbar'
import * as UIUtility from '../Utility/UIUtility'
import * as IFC from '../Viewer/IFCModel'

const plansWindow = UIUtility.CreateWindow('Plans', document.body);
const plansRoot = plansWindow[0]
const plansContainer = plansWindow[1];
const plansClose = plansRoot.getElementsByClassName('window-close').item(0) as HTMLElement;

var modelOpen: IFC.IFCModel;

plansClose.addEventListener('click', () => {
    Components.highlighter.clear();
    Components.highlighter.enabled = false;
    Toolbar.EnableTool();
    Components.plans.exitPlanView(true)
})

document.addEventListener('onModelAdded', (e: CustomEvent<IFC.IFCModel>) => {
    const ifcModel = e.detail;
    ifcModel.addEventListener('onPlans', OpenPlans)
})

async function OpenPlans(event: {target: IFC.IFCModel}) {
    if (plansContainer.parentElement != plansRoot || event.target == modelOpen)
        return;

    plansContainer.innerHTML = ''
    Components.plans.list = [];
    await Components.plans.generate(event.target.object);

    for (const plan of Components.plans.list) {
        UIUtility.CreateBigButton(plan.name, plansContainer, () => {
            Components.plans.goTo(plan.id)
        });
    }

    Components.highlighter.enabled = true;
    Toolbar.DisableTool();
    plansRoot.style.visibility = 'visible';

    modelOpen = event.target;
}

document.addEventListener('onModelRemoved', (e:CustomEvent<IFC.IFCModel>)=>{
    const ifcModel = e.detail;

    if(ifcModel == modelOpen) {
        plansContainer.innerHTML = ''
    }

    ifcModel.removeEventListener('onPlans', OpenPlans)
})