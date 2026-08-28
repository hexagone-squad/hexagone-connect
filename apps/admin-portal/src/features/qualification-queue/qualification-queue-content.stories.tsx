import type { Meta, StoryObj } from '@storybook/react-vite';
import type { QualificationQueueState } from './model/qualification-queue.js';
import { QualificationQueueContent } from './qualification-queue-content.js';

const submittedItems: QualificationQueueState['items'] = [
  {
    id: 'WR-SYNTHETIC-1042',
    serviceCategory: 'Electrical inspection',
    status: 'submitted',
    tenantId: 'tenant-demo',
  },
  {
    id: 'WR-SYNTHETIC-1043',
    serviceCategory: 'Accessibility assessment',
    status: 'submitted',
    tenantId: 'tenant-demo',
  },
];

const readyState: QualificationQueueState = {
  status: 'ready',
  items: submittedItems,
  auditEntries: [],
};

const meta = {
  title: 'POC/Qualification queue/Content',
  component: QualificationQueueContent,
  parameters: {
    docs: {
      description: {
        component:
          'Reusable Fluent UI queue states backed only by synthetic POC fixtures. These stories do not define production qualification policy.',
      },
    },
    layout: 'padded',
  },
  args: {
    pendingRequestId: null,
    onQualify: () => undefined,
  },
} satisfies Meta<typeof QualificationQueueContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {
  args: { state: readyState },
};

export const Loading: Story = {
  args: {
    state: { status: 'loading', items: [], auditEntries: [] },
  },
};

export const Empty: Story = {
  args: {
    state: { status: 'empty', items: [], auditEntries: [] },
  },
};

export const AuthorizationFailure: Story = {
  args: {
    state: { status: 'error', items: [], auditEntries: [], error: 'authorization' },
  },
};

export const QualificationPending: Story = {
  args: {
    state: readyState,
    pendingRequestId: submittedItems[0].id,
  },
};
