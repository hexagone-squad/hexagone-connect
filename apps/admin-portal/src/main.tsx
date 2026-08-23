import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  createHttpQualificationAdapter,
  QualificationQueuePage,
} from './features/qualification-queue/index.js';
import './global.css';

const appRoot = document.querySelector<HTMLElement>('#app');
if (!appRoot) throw new Error('Admin portal root is missing');

createRoot(appRoot).render(
  <StrictMode>
    <FluentProvider theme={webLightTheme} className="app-provider">
      <QualificationQueuePage
        createAdapter={(scenario) => Promise.resolve(createHttpQualificationAdapter({ scenario }))}
        createCorrelationId={() => `correlation-${crypto.randomUUID()}`}
        now={() => new Date().toISOString()}
        operator={{ actorId: 'operator-1', tenantId: 'tenant-1' }}
      />
    </FluentProvider>
  </StrictMode>,
);
