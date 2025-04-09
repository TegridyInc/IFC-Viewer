import { chain, clamp, divide, parseInt, round } from 'lodash';
import * as DockerUtility from './DockerUtility';
import { JSX } from 'react/jsx-runtime';
import * as React from 'react';


export const Foldout = (props: { name: string, children?:JSX.Element[] | JSX.Element, header?:JSX.Element, onOpen?: () => Promise<void>, onClosed?: () => Promise<void> }) => {
    const rootRef = React.useRef<HTMLDivElement>(undefined)
    const containerRef = React.useRef<HTMLDivElement>(undefined)

    const mounted = React.useRef(false);
    React.useEffect(()=>{
        if(!mounted.current) {
            mounted.current = true;
            
            const parent = rootRef.current.parentElement;
            if(parent.classList.contains('foldout-container')) {
                containerRef.current.ontransitionend = () => {
                    var height = 0;
                    parent.childNodes.forEach(child => height += (child as HTMLElement).offsetHeight)
                    parent.style.height = height + 'px';
                }            
            }
        }

    }, []);

    async function HandleArrowInput(e:React.MouseEvent) {
        if (e.button != 0)
            return;

        const button = e.target as HTMLElement;
        const container = containerRef.current;

        button.classList.toggle('arrow-open')
        container.classList.toggle('foldout-container-open');

        const isOpen = button.classList.contains('arrow-open');
        if (isOpen && props.onOpen)
            await props.onOpen();
        else if (props.onClosed)
            await props.onClosed();

        container.style.height = isOpen ? (container.scrollHeight + 'px') : ('0px')
    }

    return (
        <div className='foldout' ref={rootRef}>
            <div className='foldout-header'>
                <i className='arrow material-symbols-outlined unselectable' onClick={HandleArrowInput}>arrow_forward_ios</i>
                <div className='foldout-name'>{props.name}</div>
                {props.header}
            </div>
            <div className='foldout-container' ref={containerRef}>
                {props.children}
            </div>
        </div>
    ) 
}

export const FoldoutElement = (props: {label: string, value?: string}) => {
    return (
        <div className='foldout-element'>
            <div className='foldout-label'>- {props.label}</div>
            {
                props.value != undefined ? <div className='foldout-value'>{props.value}</div> : <></> 
            }
        </div>
    )
}

export const Window = (props: { children?: React.ReactNode[] | React.ReactNode, label: string, root?: React.RefObject<HTMLDivElement>, container?: React.RefObject<HTMLDivElement>, onClose?: React.MouseEventHandler }) => {
    var ref: React.RefObject<HTMLDivElement>;
    
    ref = props.root ? props.root : React.useRef(undefined);

    const moveWindowFunc = function (e: any) {
        ref.current.style.top = `${ ref.current.offsetTop + e.movementY}px`;
        ref.current.style.left = `${ ref.current.offsetLeft + e.movementX}px`;
    };

    
    const mounted = React.useRef(false);
    React.useEffect(()=>{
        if(!mounted.current) {
            mounted.current = true;

            DockerUtility.RegisterWindow(ref.current)
        }
    })

    return (
        <div className='window' ref={ref}>
            <div className='window-header' onMouseDown={(e)=>{
                document.addEventListener('mousemove', moveWindowFunc);
                e.target.addEventListener('mouseup', ()=>{
                    document.removeEventListener('mousemove', moveWindowFunc)
                }, {once: true})
            }}>
                <div className='window-label'>{props.label}</div>
                <div className='window-close material-symbols-outlined unselectable' onClick={(e)=>{
                    ref.current.style.visibility = 'hidden' 
                    if(props.onClose)
                        props.onClose(e)
                }}>close</div>
            </div>
            <div className='window-container' ref={props.container}>
                {props.children}
            </div>
        </div> 
    );
}

export const Button = (props: {icon:string, id?:string, onClick?:React.MouseEventHandler, ref?:React.RefObject<HTMLDivElement>, title?:string}) => {
    return(
        <i className='unselectable small-button material-symbols-outlined' id={props.id} onClick={props.onClick} ref={props.ref} title={props.title}>{props.icon}</i>
    );
}

export const BigButton = (props: {label:string, onClick: (e:React.MouseEvent) => void}) => {
    return (
        <div className='big-button unselectable' onClick={props.onClick}>{props.label}</div>
    )
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