import * as UIUtility from '../Utility/UIUtility'
import * as Components from '../Viewer/Components'

const cameraSettingsWindow = document.getElementById('camera-settings');

UIUtility.RegisterWindow(cameraSettingsWindow);

UIUtility.RegisterSlider(document.getElementById('culler-threshold'), (value) => {
    Components.culler.config.threshold = value;
    Components.culler.needsUpdate = true;
})