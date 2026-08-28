/// <reference types="vite/client" />

import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import type { Preview } from '@storybook/react-vite';
import '../src/global.css';

const preview: Preview = {
  decorators: [
    (Story) => (
      <FluentProvider theme={webLightTheme} className="app-provider">
        <Story />
      </FluentProvider>
    ),
  ],
  parameters: {
    a11y: {
      test: 'error',
    },
    controls: {
      expanded: true,
    },
  },
  tags: ['autodocs'],
};

export default preview;
