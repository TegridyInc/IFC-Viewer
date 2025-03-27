import { EventDispatcher } from 'three';
import * as Components from './Components'
import * as Toolbar from './Toolbars'
import * as UIUtility from './UIUtility'

const plansWindow = UIUtility.CreateWindow('Plans', document.body);
const plansRoot = plansWindow[0]
const plansContainer = plansWindow[1];
const plansClose = plansRoot.getElementsByClassName('window-close').item(0) as HTMLElement;

plansClose.addEventListener('click', () => {
    Components.highlighter.clear();
    Components.highlighter.enabled = false;
    Toolbar.EnableTool();
    Components.plans.exitPlanView(true)
})

document.addEventListener('onModelAdded', (e: CustomEvent) => {
    const dispatcher = e.detail.userData.dispatcher as EventDispatcher<ModelDispatcher>;

    dispatcher.addEventListener('plans', async () => {
        if (plansContainer.parentElement != plansRoot)
            return;

        plansContainer.innerHTML = ''
        Components.plans.list = [];
        await Components.plans.generate(e.detail);

        for (const plan of Components.plans.list) {
            UIUtility.CreateBigButton(plan.name, plansContainer, () => {
                Components.plans.goTo(plan.id)
            });
        }

        Components.highlighter.enabled = true;
        Toolbar.DisableTool();
        plansRoot.style.visibility = 'visible';
    });
})