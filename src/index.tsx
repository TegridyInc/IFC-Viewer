import * as _ from 'lodash';
import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import { StyledEngineProvider } from '@mui/material/styles';
import Viewer from './scripts/Viewer/Viewer';
import { ThemeProvider } from '@mui/material'
import { theme } from './scripts/Themes/Theme'

ReactDOM.createRoot(document.querySelector("#root")!).render(
    <StrictMode>
        <StyledEngineProvider injectFirst>
            <ThemeProvider theme={theme}>
                <Viewer></Viewer>
            </ThemeProvider>
        </StyledEngineProvider>
    </StrictMode>
);