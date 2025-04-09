import * as _ from 'lodash';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { StyledEngineProvider } from '@mui/material/styles';
import Viewport from './scripts/Viewer/Viewer';

ReactDOM.createRoot(document.querySelector("#root")!).render(
    <React.StrictMode>
        <StyledEngineProvider injectFirst>
           <Viewport></Viewport>
        </StyledEngineProvider>
    </React.StrictMode>
);