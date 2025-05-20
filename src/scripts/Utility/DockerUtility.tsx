import { WindowData } from './UIUtility.component'
import { styled, Tab, Tabs } from '@mui/material';
import * as React from 'react';

const Docker = styled('div')({
    display: 'flex',
    position: 'absolute',
    flexDirection: 'column',
    width: '400px',
    height: 'calc(100% - 20px)',
    top: '50%',
    backgroundColor: 'var(--secondary-color)',
    border: '2px solid var(--accent-color)',
    transform:'translateY(-50%)'
})  

const DockerTabs = styled(Tabs)({
    height: '50px',
    width: '100%',
    display: 'flex',
    alignItems: 'flex-end',
    boxSizing: 'border-box',
    overflow: 'hidden',
    minHeight: 'unset',

    '*.MuiTabs-indicator': {
        backgroundColor: 'var(--accent-color)'
    },

    '*.MuiTabs-scroller': {
        height: '100%'
    },

    '*.MuiTabs-list': {
        height: '100%'
    }
})

const DockerTab = styled(Tab)({
    fontWeight: 'bold',
    backgroundColor: '#212121',
    color: 'var(--highlight-color)',
    minHeight: 'unset',
    
    '&.Mui-selected': {
        color: 'var(--text-color)',
        backgroundColor: 'var(--secondary-color)',
    }
})

const DockerContainers = styled('div')({
    height: '100%',
    width: '100%',
    overflow: 'hidden'
})

const DockerContainer = styled('div')({
    height: '100%',

    '& > *': {
        resize: 'none',
        width: '100%',
        height: '100%',
        maxHeight: 'unset',
    }
})

const DockerContainerComponent = (props: {windowData: WindowData, isHidden: boolean})=>{    
    const containerRef = React.useRef<HTMLDivElement>(undefined);

    const mounted = React.useRef(false);
    React.useEffect(()=>{
        if(!mounted.current) {
            mounted.current = true;

        }   
        containerRef.current.appendChild(props.windowData.container);
    })

    return ( 
        <DockerContainer ref={containerRef} hidden={props.isHidden}></DockerContainer> 
    )
}

const DockerResizer = styled('div')({
    position: 'absolute',
    top: 0,
    height: '100%',
    width: '6px',
    cursor: 'w-resize',
    boxShadow: '1px',
})

const DockerCloser = styled('div', {target: 'material-symbols-outlined unselectable'})({
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '30px !important',
    background: 'var(--secondary-color)',
    border: '1px solid var(--accent-color)',
    padding: '5px 0px'
})

export default function DockerComponent(props: {isLeftDocker: boolean}) {
    const dockerRef = React.useRef<HTMLDivElement>(undefined)
    const dockerTabsRef = React.useRef<HTMLDivElement>(undefined)
    const dockerContainersRef = React.useRef<HTMLDivElement>(undefined)
    const dockerResizerRef = React.useRef<HTMLDivElement>(undefined)

    const [tabs, setTabs] = React.useState([])
    const [containers, setContainers] = React.useState([])
    const [value, setValue] = React.useState(0);

    var viewport: HTMLElement;

    const mounted = React.useRef(false)
    React.useEffect(()=>{
        if(!mounted.current) {
            mounted.current = true;
            viewport = document.getElementById('viewport');
            const docker = dockerRef.current;
            const direction = props.isLeftDocker ? -1 : 1;

            const resizeDocker = (e: MouseEvent)=> {
                docker.style.width = (docker.clientWidth + e.movementX * direction)  + 'px';
            }

            dockerResizerRef.current.addEventListener('mousedown', () => document.addEventListener('mousemove', resizeDocker))
            document.addEventListener('mouseup', () => document.removeEventListener('mousemove', resizeDocker))
        
            document.addEventListener('onWindowAdded', (e:CustomEvent<WindowData>)=>{
                const window = e.detail;
                window.header.addEventListener('mousedown', ()=>{
                    document.addEventListener('mouseup', (e)=>{
                        handleWindowMovement(e, window)
                    }, {once: true})
                })
            })
            
        }

        changeTabs(value)
    })

    const handleWindowMovement = (event: MouseEvent | React.MouseEvent, windowData: WindowData) => {
        const docker = dockerRef.current;

        const offsetLeft = docker.offsetLeft + viewport.offsetLeft;
        const offsetTop = docker.offsetTop + viewport.offsetTop - docker.offsetHeight / 2;

        if (event.clientX < offsetLeft || event.clientX > offsetLeft + docker.offsetWidth) {
            return;
        }

        if (event.clientY < offsetTop || event.clientY > offsetTop + docker.offsetHeight) {
            return;
        }

        addWindowToDocker(windowData)
    }

    const addWindowToDocker = (windowData: WindowData) => {
        const index = dockerContainersRef.current.childElementCount;
        
        const tab = (
            <DockerTab label={windowData.label.innerHTML} draggable onDragEnd={(e)=>{ removeTabFromDocker(windowData, e) }}/>
        );

        const container = (
            <DockerContainerComponent windowData={windowData} isHidden={index != 0}></DockerContainerComponent>
        )

        windowData.root.style.visibility = 'hidden'

        windowData.container.style.width = ''
        windowData.container.style.height = ''

        setTabs(oldTabs => [...oldTabs, tab])
        setContainers(oldContainers => [...oldContainers, container])

        console.log('E')
    }

    const removeTabFromDocker = (windowData: WindowData, mouseEvent: React.MouseEvent)=>{
        const dockerContainer = windowData.container.parentElement;
        var index = -1;

        for(let i = 0; i < dockerContainersRef.current.children.length; i++) {
            if(dockerContainer == dockerContainersRef.current.children.item(i)) {
                index = i
                break;
            }
        }

        windowData.root.append(windowData.container);
        windowData.root.style.visibility = 'visible'
        windowData.root.style.top = `${mouseEvent.clientY - windowData.header.clientHeight / 2}px`;
        windowData.root.style.left = `${mouseEvent.clientX - windowData.root.clientWidth / 2}px`;

        setContainers(oldContainers => oldContainers.filter((v, i) => i != index))
        setTabs(oldTabs => oldTabs.filter((v, i) => i != index))

        handleWindowMovement(mouseEvent, windowData)
    }

    const changeTabs = (value: number) => {
        setValue(value)
        const children = dockerContainersRef.current.children;
        for (let i = 0; i < children.length; i++) {
            if(i == value) {
                children.item(i).removeAttribute('hidden');
            } else {
                children.item(i).setAttribute('hidden', 'hidden');
            }
        }
    }

    const toggleDocker = (e:React.MouseEvent) => {
        const closer = e.target as HTMLElement;
        const isRight = closer.innerHTML.endsWith('right')

        closer.innerHTML = isRight ? 'keyboard_arrow_left' : 'keyboard_arrow_right'

        if((isRight && props.isLeftDocker) || (!isRight && !props.isLeftDocker)) {
            dockerRef.current.style.width = '0px'
            dockerRef.current.style.border = 'unset'
            props.isLeftDocker ? closer.style.right = 'calc(100% - 2px)' : closer.style.left = 'calc(100% - 2px)'  
        } else {
            props.isLeftDocker ? closer.style.right = '100%' : closer.style.left = '100%'  
            dockerRef.current.style.width = ''
            dockerRef.current.style.border = ''
            
            props.isLeftDocker ? dockerRef.current.style.borderRightWidth = '0px' : dockerRef.current.style.borderLeftWidth = '0px'
        }
    }

    return (
        <Docker ref={dockerRef} style={props.isLeftDocker ? 
        {
            right: 'calc(100% + 2px)',  
            borderRightWidth: '0px', 
            borderTopLeftRadius: '5px', 
            borderBottomLeftRadius: '5px'
        } : {
            left: 'calc(100% + 2px)',
            borderLeftWidth: '0px', 
            borderTopRightRadius: '5px', 
            borderBottomRightRadius: '5px'
        }} >
            <DockerTabs variant="fullWidth" value={value} onChange={(e,v)=>{changeTabs(v)}} ref={dockerTabsRef}>{tabs}</DockerTabs>
            <DockerContainers ref={dockerContainersRef}>{containers}</DockerContainers>
            <DockerResizer ref={dockerResizerRef} style={props.isLeftDocker ? {left: 0, transform: 'translateX(calc(-50% - 1px))'} : {right: 0, transform: 'translateX(calc(50% + 1px))'}}/>
            <DockerCloser onClick={toggleDocker} style={props.isLeftDocker ? {
                right: '100%',
                borderTopLeftRadius: '2px',
                borderBottomLeftRadius: '2px',
            } : {
                left: '100%',
                borderTopRightRadius: '2px',
                borderBottomRightRadius: '2px',
            }}>{props.isLeftDocker ? 'keyboard_arrow_right' : 'keyboard_arrow_left'}</DockerCloser>
        </Docker>
    )
}