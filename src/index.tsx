import * as _ from 'lodash';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { StyledEngineProvider } from '@mui/material/styles';
import Viewport from './scripts/Viewer/Viewer';
import { ThemeProvider } from '@mui/material'
import { theme } from './scripts/Themes/Theme'

ReactDOM.createRoot(document.querySelector("#root")!).render(
    <React.StrictMode>
        <StyledEngineProvider injectFirst>
            <ThemeProvider theme={theme}>
                <Viewport></Viewport>
            </ThemeProvider>
        </StyledEngineProvider>
    </React.StrictMode>
);