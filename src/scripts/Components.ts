import * as COM from '@thatopen/components';
import * as OBF from '@thatopen/components-front';
import * as UI from '@thatopen/ui';
import * as THREE from 'three';

const container = document.getElementById('container');
const components = new COM.Components();

export const exporter = components.get(COM.IfcJsonExporter);
export const ifcloader = components.get(COM.IfcLoader);
export const worlds = components.get(COM.Worlds);
export const world = worlds.create<COM.SimpleScene, COM.OrthoPerspectiveCamera, COM.SimpleRenderer>();
export const clipper = components.get(COM.Clipper);
export const cullers = components.get(COM.Cullers);
export const boundingBoxer = components.get(COM.BoundingBoxer);
export const casters = components.get(COM.Raycasters);
export const grids = components.get(COM.Grids);
export const propsManager = components.get(COM.IfcPropertiesManager);
export const highlighter = components.get(OBF.Highlighter);
export const indexer = components.get(COM.IfcRelationsIndexer)

export var grid: COM.SimpleGrid;
export var caster: COM.SimpleRaycaster;
export var culler: COM.MeshCullerRenderer;

var cameraInput = new THREE.Vector3;

export function Initialize() {
    ifcloader.setup();

    UI.Manager.init()
    components.init();

    world.scene = new COM.SimpleScene(components);
    world.renderer = new COM.SimpleRenderer(components, container);
    world.camera = new COM.OrthoPerspectiveCamera(components);

    world.scene.setup({ backgroundColor: new THREE.Color(.05, .05, .05) });

    highlighter.setup({ world });

    grid = grids.create(world);
    caster = casters.get(world);
    
    clipper.enabled = true;
    clipper.setup({ color: new THREE.Color(1, 1, 1) })
    
    culler = cullers.create(world);
    culler.config.threshold = 0;
    culler.needsUpdate = true;
    
    culler.config.renderDebugFrame = true;
    culler.config.width = 350;
    culler.config.height = 350;

    world.renderer.onResize.add(()=>{
        world.camera.updateAspect();
        world.renderer.three.render(world.scene.three, world.camera.three)
    })

    world.camera.controls.addEventListener("sleep", () => {
        culler.needsUpdate = true;
    });

    document.addEventListener('keydown', e => {
        if(!e.repeat) {
            if((e.key == 'w' && cameraInput.x != 1) || (e.key == 's' && cameraInput.x != -1))
                cameraInput.add(new THREE.Vector3(Number(e.key == 'w') + -Number(e.key == 's'), 0, 0))
            
            if((e.key == 'd' && cameraInput.y != 1) || (e.key == 'a' && cameraInput.y != -1)) 
                cameraInput.add(new THREE.Vector3(0, Number(e.key == 'd') + -Number(e.key == 'a'), 0))
            
            if((e.key == ' ' && cameraInput.z != -1) || (e.shiftKey && cameraInput.z != 1))
                cameraInput.add(new THREE.Vector3(0, 0, -Number(e.key == ' ') + Number(e.key == 'Shift')))
        }   
    })
    
    document.addEventListener('keyup', e => {
        if(e.repeat)
            return;
        
        cameraInput.sub(new THREE.Vector3(Number(e.key == 'w') + -Number(e.key == 's'), Number(e.key == 'd') + -Number(e.key == 'a'), -Number(e.key == ' ') + Number(e.key == 'Shift')))
    })

    const cameraControls = world.camera.controls;
    const clock = new THREE.Clock();
    clock.start();
    setInterval(()=> {
        const deltaTime = clock.getDelta();
        
        if(cameraInput.length() == 0)
            return;

        const input = cameraInput.clone().multiplyScalar(deltaTime * 10);
        cameraControls.truck(input.y, input.z, true);
        cameraControls.forward(input.x, true);
    }, 10);
}