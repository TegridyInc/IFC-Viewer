export function CreateFoldout(name: string, parent:HTMLElement): HTMLElement {
    const foldout = document.createElement('div');
    foldout.classList.add('foldout')
    parent.append(foldout)

    const foldoutHeader = document.createElement('div')
    foldoutHeader.classList.add('foldout-header')
    foldout.append(foldoutHeader)
    
    const foldoutButton = document.createElement('i')
    foldoutButton.addEventListener('click', (e)=> {
        if(e.button != 0)
            return;

        foldoutButton.classList.toggle('arrow-open')
        foldoutContainer.classList.toggle('foldout-container-open');
        
        foldoutContainer.style.height = foldoutButton.classList.contains('arrow-open') ? (foldoutContainer.scrollHeight + 'px') : ('0px')
    })
    foldoutButton.innerHTML = 'arrow_forward_ios'
    foldoutButton.classList.add('arrow', 'material-symbols-outlined', 'unselectable')
    foldoutHeader.append(foldoutButton);
    
    const foldoutName = document.createElement('div')
    foldoutName.innerHTML = name;
    foldoutName.classList.add('foldout-name')
    foldoutHeader.append(foldoutName)

    const foldoutContainer = document.createElement('div');
    foldoutContainer.classList.add('foldout-container');
    foldout.append(foldoutContainer);

    if(parent.classList.contains('foldout-container')) 
        foldoutContainer.ontransitionend = () => {
            var height = 0;
            parent.childNodes.forEach(child => height += (child as HTMLElement).offsetHeight)
            parent.style.height = height + 'px';
        }

    return foldoutContainer;
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
    windowHeader.addEventListener("mousedown", () => document.addEventListener("mousemove", moveWindowFunc))
    document.addEventListener("mouseup", () => document.removeEventListener("mousemove", moveWindowFunc))

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

    return [window, windowContainer];
}