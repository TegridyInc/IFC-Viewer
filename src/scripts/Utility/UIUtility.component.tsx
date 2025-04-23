import { chain, clamp, divide, parseInt, round } from 'lodash';
import * as DockerUtility from './DockerUtility';
import { JSX } from 'react/jsx-runtime';
import * as React from 'react';
import * as MAT from '@mui/material'
import { EventDispatcher, Event } from 'three';

//#region Foldout

export const FoldoutComponent = (props: { name: string, sx?:MAT.SxProps, children?:JSX.Element[] | JSX.Element, header?:JSX.Element, onOpen?: () => Promise<void>, onClosed?: () => Promise<void> }) => {
    const [expanded, setExpansion] = React.useState(false);
   
    const foldoutExpand = React.useRef(undefined)
    const foldoutContainer = React.useRef(undefined)
    const foldoutHeader = React.useRef(undefined)
    
    const handleExpansion = (e:React.MouseEvent) => {
        if(e.target != foldoutHeader.current) 
            return;
            
        setExpansion((oldValue)=>!oldValue)
        
        foldoutExpand.current.style.transform = !expanded ? 'rotate(0deg)' : 'rotate(180deg)';
        foldoutContainer.current.style.marginTop = !expanded ? '5px' : '0px';

        if (!expanded && props.onOpen)
            props.onOpen();
        else if (props.onClosed)
            props.onClosed();
    }

    return (
        <Foldout sx={props.sx}>
            <FoldoutHeader ref={foldoutHeader} onClick={handleExpansion}>
                <FoldoutLabel>{props.name}</FoldoutLabel>
                {props.header}
                <FoldoutExpand ref={foldoutExpand}>keyboard_arrow_up</FoldoutExpand>
            </FoldoutHeader>
            <FoldoutContainer ref={foldoutContainer} in={expanded} timeout="auto">
                <MAT.Stack divider={<MAT.Divider sx={{opacity: 1, backgroundColor: 'var(--highlight-color)'}} flexItem variant='fullWidth' />}>
                    {props.children}
                </MAT.Stack>
            </FoldoutContainer>
        </Foldout>
    ) 
}

const Foldout = MAT.styled(MAT.List)({
    boxSizing: 'border-box',
    width: '100%',
    rowGap: '10px',
    backgroundColor: 'var(--secondary-color)',
    borderRadius: '5px',
    padding: '5px'
})

const FoldoutHeader = MAT.styled('div')({
    display: 'flex',
    alignItems: 'center',
    fontSize: '15px',
})

const FoldoutLabel = MAT.styled('div', {target: 'unselectable'})({
    paddingLeft: '5px',
    marginRight: 'auto',
    pointerEvents: 'none',
    fontWeight: '300',
    overflow: 'hidden'
})

const FoldoutContainer = MAT.styled(MAT.Collapse)({
    height: 0,
    overflow: 'hidden',
    transition: 'height 0.1s',
    border: '1px solid var(--highlight-color)',
    borderRadius: '5px',
    boxShadow: '1px 1px 3px black'
})

const FoldoutExpand = MAT.styled('div', {target: 'material-symbols-outlined unselectable'})({
   transform: 'rotate(180deg)',
   pointerEvents: 'none',
})

export const FoldoutElementComponent = (props: {label: string, value?: string}) => {
    return (
        <FoldoutElement>
            <FoldoutLabel>{props.label}</FoldoutLabel>
            {
                props.value != undefined ? <FoldoutValue>{props.value}</FoldoutValue> : <></> 
            }
        </FoldoutElement>
    )
}

const FoldoutElement = MAT.styled('div')({
    display: 'flex',
    flexDirection: 'row',
    fontSize: 'smaller',
    padding: '2px'
})

const FoldoutValue = MAT.styled('div')({
    display: 'flex',
    marginLeft: 'auto'
})

//#endregion

//#region Window

interface WindowDispatcher {
    onWindowMoved: {
        target: WindowData
        event: MouseEvent
    };
}

export class WindowData extends EventDispatcher<WindowDispatcher> {
    root:  HTMLDivElement;
    header: HTMLDivElement;
    label: HTMLDivElement;
    container: HTMLDivElement;

    constructor(Root: HTMLDivElement, Header: HTMLDivElement, Label: HTMLDivElement, Container: HTMLDivElement) {
        super();

        this.root = Root;
        this.header = Header;
        this.label = Label;
        this.container = Container;
    }
}

export var OnWindowAdded: CustomEvent<WindowData>;

export const WindowComponent = (props: { children?: React.ReactNode[] | React.ReactNode, label: string, root?: React.RefObject<HTMLDivElement>, container?: React.RefObject<HTMLDivElement>, onClose?: React.MouseEventHandler }) => {
    var rootRef: React.RefObject<HTMLDivElement>;
    var containerRef: React.RefObject<HTMLDivElement>;
    const headerRef = React.useRef<HTMLDivElement>(undefined);
    const labelRef = React.useRef<HTMLDivElement>(undefined);

    rootRef = props.root ? props.root : React.useRef(undefined);
    containerRef = props.container ? props.container : React.useRef(undefined);

    var windowData: WindowData;

    const mounted = React.useRef(false);
    React.useEffect(()=>{
        if(!mounted.current) {
            mounted.current = true;
            
            windowData = new WindowData(rootRef.current, headerRef.current, labelRef.current, containerRef.current)
            
            OnWindowAdded = new CustomEvent('onWindowAdded', {detail: windowData})
            document.dispatchEvent(OnWindowAdded)
        }
    }, [])

    const handleWindow = (e: React.MouseEvent<HTMLDivElement>)=>{
        document.addEventListener('mousemove', moveWindowFunc);
        document.addEventListener('mouseup', ()=>{
            document.removeEventListener('mousemove', moveWindowFunc)
        }, {once: true})
    }
    
    const moveWindowFunc = (e: MouseEvent) => {
        rootRef.current.style.top = `${ rootRef.current.offsetTop + e.movementY}px`;
        rootRef.current.style.left = `${ rootRef.current.offsetLeft + e.movementX}px`;
    };
    
    const closeWindow = (e:React.MouseEvent)=>{
        rootRef.current.style.visibility = 'hidden' 
        if(props.onClose)
            props.onClose(e)
        
    }

    return (
        <Window ref={rootRef}>
            <WindowHeader ref={headerRef} onMouseDown={handleWindow}>
                <WindowLabel ref={labelRef}>{props.label}</WindowLabel>
                <IconButton onClick={closeWindow}>close</IconButton>
            </WindowHeader>
            <WindowContainer ref={containerRef}>
                {props.children ? props.children : <></>}
            </WindowContainer>
        </Window> 
    );
}

const Window = MAT.styled('div')({
    display: 'flex',
    flexDirection: 'column',
    position: 'absolute',
    top: '10%',
    left: '10%',
    visibility: 'hidden',
    border: '1px solid var(--accent-color)',
    borderRadius: '5px',
    background: 'black',
    overflow: 'hidden',
    alignItems: 'stretch',
    zIndex: 1000,
})

const WindowHeader = MAT.styled('div')({
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: 'calc(100% - 6px)',
    height: '30px',
    padding: '3px',
    background: 'var(--secondary-color)'
})

const WindowLabel = MAT.styled('div', {target: 'unselectable'})({
    display: 'flex',
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    fontWeight: 'bold',
    textWrap: 'nowrap',
})

const WindowContainer = MAT.styled('div')({
   display: 'flex',
   flexDirection: 'column',
   boxSizing: 'border-box',
   minWidth: '250px',
   maxHeight: '80vh',
   padding: '7px',
   background: 'var(--primary-color)',
   overflow: 'hidden overlay',
   resize: 'both', 

   '&:empty': {
        padding: '0px'  
   }
})

//#endregion

export const IconButton = MAT.styled(MAT.IconButton, {target: 'material-symbols-outlined'})({
   color: '#ffffff',
   height: 'auto',
   padding: '5px',
   fontSize: '20px !important',
   borderRadius: '5px',
   backgroundColor: '#343434',
   boxShadow: '1px 1px 3px 0px #202020',
   border: '1px solid rgba(0, 0, 0, 0.12)'
})

export const BigButton = MAT.styled(MAT.Button)({
    width: 'calc(100% - 10px)',
    height: '20px',
    padding: '5px',
    backgroundColor: 'var(--secondary-color)',
    boxSizing: 'content-box',
    border: '1px solid var(--highlight-color)'
})

export const ToggleButton = MAT.styled(MAT.ToggleButton, {target: 'material-symbols-outlined'})({
    color: 'white',
    height: 'auto',
    padding: '5px',
    fontSize: '20px !important',
    backgroundColor: '#343434',
    boxShadow: '1px 1px 3px 0px #202020',
    border: '1px solid rgba(0, 0, 0, 0.12)',
   
    '&.Mui-selected': {
        color: 'black',
        backgroundColor: '#efefef',

        '&:hover': {
            backgroundColor: '#cdcdcd'
        }
    },
    
    '&:hover': {
        backgroundColor: '#292929',
    }
})

export const ColorInput = MAT.styled('input')({
    aspectRatio: 1,
    width: 'unset',
    background: 'unset',
    outline: '0',
    appearance: 'none',
    border: 0,
    backgroundColor: '#343434',
    boxSizing: 'content-box',
    padding: '5px',
    margin: '2px',
    borderRadius: '5px',
    height: '20px',
    boxShadow: '1px 1px 3px 0px #202020',

    '&::-webkit-color-swatch-wrapper': {
        padding: '0'
    },

    '&::-webkit-color-swatch': {
        borderRadius: '5px',
        border: '1px solid white',
    }
});


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


