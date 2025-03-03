import './DockerUtility';
import { RegisterWindow } from './DockerUtility';

interface FoldoutData {
    parent:HTMLElement;
    header:HTMLElement;
    container:HTMLElement;
}

export function CreateFoldout(name: string, parent:HTMLElement, onOpen?:()=>Promise<void>, onClosed?:()=>Promise<void>): FoldoutData {
    var foldoutData = {} as FoldoutData;
    const foldout = document.createElement('div');
    foldoutData.parent = foldout;
    foldout.classList.add('foldout')
    parent.append(foldout)

    const foldoutHeader = document.createElement('div')
    foldoutData.header = foldoutHeader;
    foldoutHeader.classList.add('foldout-header')
    foldout.append(foldoutHeader)
    
    const foldoutButton = document.createElement('i')
    foldoutButton.addEventListener('click', async(e)=> {
        if(e.button != 0)
            return;

        foldoutButton.classList.toggle('arrow-open')
        foldoutContainer.classList.toggle('foldout-container-open');
        
        const isOpen = foldoutButton.classList.contains('arrow-open');
        if(isOpen && onOpen) 
            await onOpen();
        else if(onClosed) 
            await onClosed();
        
        foldoutContainer.style.height = isOpen ? (foldoutContainer.scrollHeight + 'px') : ('0px')
    })
    foldoutButton.innerHTML = 'arrow_forward_ios'
    foldoutButton.classList.add('arrow', 'material-symbols-outlined', 'unselectable')
    foldoutHeader.append(foldoutButton);
    
    const foldoutName = document.createElement('div')
    foldoutName.innerHTML = name;
    foldoutName.classList.add('foldout-name')
    foldoutHeader.append(foldoutName)

    const foldoutContainer = document.createElement('div');
    foldoutData.container = foldoutContainer;
    foldoutContainer.classList.add('foldout-container');
    foldout.append(foldoutContainer);

    if(parent.classList.contains('foldout-container')) 
        foldoutContainer.ontransitionend = () => {
            var height = 0;
            parent.childNodes.forEach(child => height += (child as HTMLElement).offsetHeight)
            parent.style.height = height + 'px';
        }

    return foldoutData;
}

export function CreateFoldoutElement(label:string, value?:any, parent?:HTMLElement) {
    const foldoutElement = document.createElement('div');
    foldoutElement.classList.add('foldout-element')

    const foldoutLabel = document.createElement('div')
    foldoutLabel.innerHTML = ' - ' + label;
    foldoutLabel.classList.add('foldout-label')
    foldoutElement.append(foldoutLabel)

    if(value != undefined && value != null) {
        const foldoutValue = document.createElement('div');
        foldoutValue.innerHTML = value.toString();
        foldoutValue.classList.add('foldout-value')
        foldoutElement.append(foldoutValue)
    }

    parent?.append(foldoutElement);
}

export function CreateWindow(name:string, parent:HTMLElement) : [HTMLElement, HTMLElement] {
    const window = document.createElement('div');
    window.classList.add('window');
    parent.append(window);

    const windowHeader = document.createElement('div');
    windowHeader.classList.add('window-header');
    window.append(windowHeader);

    const moveWindowFunc = function(e:MouseEvent){
        window.style.top = `${window.offsetTop + e.movementY}px`;
        window.style.left = `${window.offsetLeft + e.movementX}px`;
    };
    windowHeader.addEventListener("mousedown", () => {
        document.addEventListener("mousemove", moveWindowFunc)
        document.addEventListener("mouseup", () => document.removeEventListener("mousemove", moveWindowFunc), {once:true})
    })

    const windowLabel = document.createElement('div');
    windowLabel.innerHTML = name;
    windowLabel.classList.add('window-label', 'unselectable');
    windowHeader.append(windowLabel);

    const windowClose = document.createElement('i');
    windowClose.innerHTML = 'close';
    windowClose.classList.add('window-close', 'material-symbols-outlined', 'unselectable');
    windowHeader.append(windowClose);

    windowClose.addEventListener('click', () => window.style.visibility = 'hidden')
    
    const windowContainer = document.createElement('div');
    windowContainer.classList.add('window-container');
    window.append(windowContainer);

    RegisterWindow(window, windowHeader);

    return [window, windowContainer];
}

export function CreateButton(iconName:string, parent:HTMLElement, onClick:(e:MouseEvent)=>void, tooltip?:string) {
    const button = document.createElement('i');
    button.classList.add('small-button', 'material-symbols-outlined', 'unselectable');

    button.innerHTML = iconName;
    button.onclick = onClick;

    if(tooltip)
        button.title = tooltip;
    
    parent.append(button)
}

export function CreateColorInput(hex:string, parent:HTMLElement, onValueChanged:(e:InputEvent)=>void, tooltip?:string) {
    const colorInput = document.createElement('input')
    colorInput.type = 'color';
    colorInput.classList.add('color-input');
    colorInput.value = hex;

    colorInput.onchange = onValueChanged;

    if(tooltip)
        colorInput.title = tooltip;
    parent.append(colorInput);
}