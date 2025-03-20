import { clamp, parseInt, round } from 'lodash';
import * as DockerUtility from './DockerUtility';
import * as IFCViewer from './IFCViewer'

interface FoldoutData {
    parent: HTMLElement;
    header: HTMLElement;
    container: HTMLElement;
}

var ModelManagerContainer: HTMLElement;

export function Initialize(modelManagerContainer: HTMLElement) {
    ModelManagerContainer = modelManagerContainer;
}

export function RegisterWindows() {
    const windows = document.getElementsByClassName('window');

    for (const element of windows) {
        const window = element as HTMLElement;

        const windowHeader = window.getElementsByClassName('window-header').item(0);
        if (!windowHeader) {
            console.log(window + ' Does not have a header');
            continue;
        }

        const moveWindowFunc = function (e: MouseEvent) {
            window.style.top = `${window.offsetTop + e.movementY}px`;
            window.style.left = `${window.offsetLeft + e.movementX}px`;
        };
        windowHeader.addEventListener("mousedown", () => {
            document.addEventListener("mousemove", moveWindowFunc)
            document.addEventListener("mouseup", () => document.removeEventListener("mousemove", moveWindowFunc), { once: true })
        })

        const closeWindow = windowHeader.getElementsByClassName('window-close').item(0);
        if (!closeWindow) {
            console.error(windowHeader + ' Does not have a close button');
            continue;
        }

        closeWindow.addEventListener('click', () => {
            (window as HTMLElement).style.visibility = 'hidden';
        })

        DockerUtility.RegisterWindow(window);
    }
}

export function CreateFoldout(name: string, parent: HTMLElement, onOpen?: () => Promise<void>, onClosed?: () => Promise<void>): FoldoutData {
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
    foldoutButton.addEventListener('click', async (e) => {
        if (e.button != 0)
            return;

        foldoutButton.classList.toggle('arrow-open')
        foldoutContainer.classList.toggle('foldout-container-open');

        const isOpen = foldoutButton.classList.contains('arrow-open');
        if (isOpen && onOpen)
            await onOpen();
        else if (onClosed)
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

    if (parent.classList.contains('foldout-container'))
        foldoutContainer.ontransitionend = () => {
            var height = 0;
            parent.childNodes.forEach(child => height += (child as HTMLElement).offsetHeight)
            parent.style.height = height + 'px';
        }

    return foldoutData;
}

export function CreateFoldoutElement(label: string, value?: any, parent?: HTMLElement) {
    const foldoutElement = document.createElement('div');
    foldoutElement.classList.add('foldout-element')

    const foldoutLabel = document.createElement('div')
    foldoutLabel.innerHTML = ' - ' + label;
    foldoutLabel.classList.add('foldout-label')
    foldoutElement.append(foldoutLabel)

    if (value != undefined && value != null) {
        const foldoutValue = document.createElement('div');
        foldoutValue.innerHTML = value.toString();
        foldoutValue.classList.add('foldout-value')
        foldoutElement.append(foldoutValue)
    }

    parent?.append(foldoutElement);
}

export function CreateWindow(name: string, parent: HTMLElement, id?: string): [HTMLElement, HTMLElement] {
    const window = document.createElement('div');
    if (id)
        window.id = id;
    window.classList.add('window');
    parent.append(window);

    const windowHeader = document.createElement('div');
    windowHeader.classList.add('window-header');
    window.append(windowHeader);

    const moveWindowFunc = function (e: MouseEvent) {
        window.style.top = `${window.offsetTop + e.movementY}px`;
        window.style.left = `${window.offsetLeft + e.movementX}px`;
    };
    windowHeader.addEventListener("mousedown", () => {
        document.addEventListener("mousemove", moveWindowFunc)
        document.addEventListener("mouseup", () => document.removeEventListener("mousemove", moveWindowFunc), { once: true })
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

    DockerUtility.RegisterWindow(window);

    return [window, windowContainer];
}

export function CreateButton(iconName: string, parent: HTMLElement, onClick: (e: MouseEvent) => void, tooltip?: string, customIcon?: boolean) {
    const button = document.createElement('i');
    button.classList.add('small-button', 'unselectable');
    button.classList.add(customIcon ? 'custom-icons' : 'material-symbols-outlined')

    if (customIcon)
        button.classList.add(iconName);
    else
        button.innerHTML = iconName;
    button.onclick = onClick;

    if (tooltip)
        button.title = tooltip;

    parent.append(button)
}

export function CreateColorInput(hex: string, parent: HTMLElement, onValueChanged: (e: InputEvent) => void, tooltip?: string) {
    const colorInput = document.createElement('input')
    colorInput.type = 'color';
    colorInput.classList.add('color-input');
    colorInput.value = hex;

    colorInput.onchange = onValueChanged;

    if (tooltip)
        colorInput.title = tooltip;
    parent.append(colorInput);
}

export function CreateSlider(minValue: number, maxValue: number, container: HTMLElement, valueChanged: (value: number) => void, absolute?: boolean): HTMLElement {
    const slider = document.createElement('div')
    container.append(slider)
    slider.classList.add('slider')

    if (absolute)
        slider.classList.add('slider-absolute')

    const min = document.createElement('div')
    min.innerHTML = minValue.toString();
    slider.append(min)

    const sliderRail = document.createElement('div')
    sliderRail.classList.add('slider-rail')
    slider.append(sliderRail);

    const sliderNob = document.createElement('div')
    sliderNob.style.left = 'clamp(0%, 0px, 100%)'
    sliderNob.classList.add('slider-nob')
    sliderRail.append(sliderNob)

    const sliderValue = document.createElement('div');
    sliderValue.innerHTML = minValue.toString();
    sliderValue.classList.add('slider-value')
    sliderNob.append(sliderValue)

    const max = document.createElement('div')
    max.innerHTML = maxValue.toString();
    slider.append(max)

    sliderNob.addEventListener("mousedown", (e) => {
        e.stopImmediatePropagation();
        sliderValue.style.visibility = 'visible'

        function MoveNob(e: MouseEvent) {
            var parsedValue = parseInt(sliderNob.style.left.split(" ")[1]);
            parsedValue += e.movementX;
            sliderNob.style.left = `clamp(0%, ${parsedValue}px, 100%)`;

            const normalized = (1 / sliderRail.clientWidth) * parsedValue;
            var value = (maxValue - minValue) * normalized + minValue;

            value = round(value)
            value = clamp(value, minValue, maxValue)

            sliderValue.innerHTML = value.toString();
        }

        document.addEventListener("mousemove", MoveNob);
        document.addEventListener(
            "mouseup",
            (e) => {
                document.removeEventListener("mousemove", MoveNob);
                sliderValue.style.visibility = 'hidden'

                var parsedValue = parseInt(sliderNob.style.left.split(" ")[1]);

                parsedValue = parsedValue > sliderRail.clientWidth ? sliderRail.clientWidth : parsedValue < 0 ? 0 : parsedValue;
                sliderNob.style.left = `clamp(0%, ${parsedValue}px, 100%)`;

                const normalized = (1 / sliderRail.clientWidth) * parsedValue;
                const value = (maxValue - minValue) * normalized + minValue;

                valueChanged(value);
            },
            { once: true }
        );
    });

    return slider;
}

export function RegisterSlider(slider: HTMLElement, valueChanged: (value: number) => void) {
    const sliderValue = slider.getElementsByClassName('slider-value').item(0) as HTMLElement;
    const sliderRail = slider.getElementsByClassName('slider-rail').item(0) as HTMLElement;
    const sliderNob = slider.getElementsByClassName('slider-nob').item(0) as HTMLElement;
    const minValue = parseInt(slider.getElementsByClassName('slider-min').item(0).innerHTML)
    const maxValue = parseInt(slider.getElementsByClassName('slider-max').item(0).innerHTML)

    sliderNob.addEventListener("mousedown", (e) => {
        e.stopImmediatePropagation();
        sliderValue.style.visibility = 'visible'

        function MoveNob(e: MouseEvent) {
            var parsedValue = parseInt(sliderNob.style.left.split(" ")[1]);
            parsedValue += e.movementX;
            sliderNob.style.left = `clamp(0%, ${parsedValue}px, 100%)`;

            const normalized = (1 / sliderRail.clientWidth) * parsedValue;
            var value = (maxValue - minValue) * normalized + minValue;

            value = round(value)
            value = clamp(value, minValue, maxValue)

            sliderValue.innerHTML = value.toString();
        }

        document.addEventListener("mousemove", MoveNob);
        document.addEventListener(
            "mouseup",
            (e) => {
                document.removeEventListener("mousemove", MoveNob);
                sliderValue.style.visibility = 'hidden'

                var parsedValue = parseInt(sliderNob.style.left.split(" ")[1]);

                parsedValue = parsedValue > sliderRail.clientWidth ? sliderRail.clientWidth : parsedValue < 0 ? 0 : parsedValue;
                sliderNob.style.left = `clamp(0%, ${parsedValue}px, 100%)`;

                const normalized = (1 / sliderRail.clientWidth) * parsedValue;
                const value = (maxValue - minValue) * normalized + minValue;

                valueChanged(value);
            },
            { once: true }
        );
    });

}