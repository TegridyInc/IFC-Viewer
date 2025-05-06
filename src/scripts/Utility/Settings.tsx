import {WindowComponent, SelectInput, SelectLabel, FoldoutComponent, Checkbox, CheckboxLabel, SliderComponent, CheckboxContainer} from './UIUtility.component'
import * as React from 'react'; 
import * as Components from '../Viewer/Components'
import { styled, MenuItem, SelectChangeEvent, Stack, FormControl } from '@mui/material';

const Settings = styled(WindowComponent)();

const SettingsComponent = () => {
    const [projection, setProjection] = React.useState(0)
    const [navigation, setNavigation] = React.useState(0)

    const rootRef = React.useRef<HTMLDivElement>(undefined);
    const mounted = React.useRef(false);

    React.useEffect(()=>{
        if(!mounted.current) {
            mounted.current = true;

            const openSettings = document.getElementById('open-settings')
            openSettings.addEventListener('click', () => {
                rootRef.current.style.visibility = 'visible'
            })
        }
    }, [])

    const changeProjection = (e: SelectChangeEvent<number>)=>{
        Components.world.camera.projection.set(e.target.value ? 'Orthographic' : 'Perspective')
        setProjection(e.target.value as number)
    }

    const changeNavigation = (e: SelectChangeEvent<number>)=>{
        Components.world.camera.set(e.target.value ? 'FirstPerson' : 'Orbit');
        setNavigation(e.target.value as number)
    }

    const changeCullerThreshold = (e: Event, value: number) => {
        Components.culler.config.threshold = value
        Components.culler.needsUpdate = true
    }

    return (
        <Settings label={'Settings'} root={rootRef}>
            <Stack spacing={.5}>
                <FoldoutComponent name='Camera' sx={{border: '1px solid var(--highlight-color)'}}>
                    <FormControl variant="filled" fullWidth>
                        <SelectLabel id='projection-label'>Projection</SelectLabel>
                        <SelectInput labelId='projection-label' label='Projection' value={projection} onChange={changeProjection}>
                            <MenuItem value={0}>Perspective</MenuItem>
                            <MenuItem disabled={navigation == 1} value={1}>Orthographic</MenuItem>
                        </SelectInput>
                    </FormControl>
                    <FormControl variant="filled" fullWidth>
                        <SelectLabel id='navigation-label'>Navigation</SelectLabel>
                        <SelectInput labelId='navigation-label' label='Navigation' value={navigation} onChange={changeNavigation}>
                            <MenuItem value={0}>Orbit</MenuItem>
                            <MenuItem disabled={projection == 1} value={1}>First Person</MenuItem>
                        </SelectInput>
                    </FormControl>
                </FoldoutComponent>
    
                <FoldoutComponent name='Graphics' sx={{border: '1px solid var(--highlight-color)'}}>
                    <SliderComponent label='Culler Threshold' min={0} max={50} onChange={changeCullerThreshold}/>

                    <FoldoutComponent name='Post Production'>
                        <FoldoutComponent name='Ambient Oclussion' header={<Checkbox onChange={(e, v) => Components.postproduction.setPasses({ ao: v })}/>}>
                            <CheckboxContainer>
                                <CheckboxLabel>Half Resolution</CheckboxLabel>
                                <Checkbox onChange={(e, v) => Components.ambientOclussion.halfRes = v}></Checkbox>
                            </CheckboxContainer>
                            <CheckboxContainer>
                                <CheckboxLabel>Screen Space Radius</CheckboxLabel>
                                <Checkbox onChange={(e, v) => Components.ambientOclussion.screenSpaceRadius = v}></Checkbox>
                            </CheckboxContainer>
                            <SliderComponent label='Samples' defaultValue={8} min={1} max={16} onChange={(e, v) => Components.ambientOclussion.aoSamples = v}/>
                            <SliderComponent label='Denoise Samples' defaultValue={8} min={1} max={16} onChange={(e, v) => Components.ambientOclussion.denoiseSamples = v}/>
                            <SliderComponent label='Denoise Radius' defaultValue={50} min={0} max={100} onChange={(e, v) => Components.ambientOclussion.denoiseRadius = v}/>
                            <SliderComponent label='AO Radius' defaultValue={2} min={0} max={16} onChange={(e, v) => Components.ambientOclussion.aoRadius = v}/>
                            <SliderComponent label='Distance Falloff' defaultValue={4} min={0} max={16} onChange={(e, v) => Components.ambientOclussion.distanceFalloff = v}/>
                            <SliderComponent label='Intensity' defaultValue={2} min={0} max={16} onChange={(e, v) => Components.ambientOclussion.intensity = v}/>
                        </FoldoutComponent>
                        <FoldoutComponent name='Line Edges' header={<Checkbox onChange={(e, v)=> Components.postproduction.setPasses({ custom: v })}/>}>
                            <CheckboxContainer>
                                <CheckboxLabel>Gamma Correction</CheckboxLabel>
                                <Checkbox onChange={(e, v) => Components.postproduction.setPasses({ gamma: v })}></Checkbox>
                            </CheckboxContainer>
                            <SliderComponent label='Opacity' step={.01} min={0} max={1} onChange={(e, v)=>Components.postproduction.customEffects.opacity = v}/>
                            <SliderComponent label='Tolarance' step={.1} min={0} max={6} onChange={(e, v)=> Components.postproduction.customEffects.tolerance = v}/>
                        </FoldoutComponent>
                        <FoldoutComponent name='Gloss' header={<Checkbox onChange={(e, v)=> Components.postproduction.customEffects.glossEnabled = v}/>}>
                            <SliderComponent label='Gloss Exponent' defaultValue={1.9} step={.1} min={0} max={5} onChange={(e, v) => Components.postproduction.customEffects.glossExponent = v}/>
                            <SliderComponent label='Max Gloss' defaultValue={.1} step={.1} min={-2} max={2} onChange={(e, v) => Components.postproduction.customEffects.maxGloss = v}/>
                            <SliderComponent label='Min Gloss' defaultValue={-.1} step={.1} min={-2} max={2} onChange={(e, v) => Components.postproduction.customEffects.minGloss = v}/>

                        </FoldoutComponent>
                    </FoldoutComponent>
                </FoldoutComponent>
            </Stack>
        </Settings> 
    )
}

export default SettingsComponent;