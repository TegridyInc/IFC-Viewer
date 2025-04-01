import * as _ from 'lodash';
import './scripts/Viewer/Viewer'
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { StyledEngineProvider } from '@mui/material/styles';



ReactDOM.createRoot(document.querySelector("#root")!).render(
  <React.StrictMode>
    <StyledEngineProvider injectFirst>
    </StyledEngineProvider>
  </React.StrictMode>
);