import { Button, Text } from '@fluentui/react-components';
import { ArrowClockwiseRegular } from '@fluentui/react-icons';
import { en } from '../../locales/en.js';
import type { QualificationQueueState } from './model/qualification-queue.js';
import { QualificationQueueContent } from './qualification-queue-content.js';
import { useQualificationQueueStyles } from './qualification-queue.styles.js';

interface QualificationQueuePanelProps {
  state: QualificationQueueState;
  pendingRequestId: string | null;
  onQualify: (requestId: string) => void;
  onRefresh: () => void;
}

export function QualificationQueuePanel({
  state,
  pendingRequestId,
  onQualify,
  onRefresh,
}: QualificationQueuePanelProps) {
  const styles = useQualificationQueueStyles();
  const count = state.status === 'ready' ? state.items.length : 0;

  return (
    <section className={styles.queuePanel} aria-labelledby="queue-heading">
      <div className={styles.panelHeading}>
        <Text as="h2" id="queue-heading" className={styles.panelTitle}>
          {en.queueTitle}
        </Text>
        <Text size={200} className={styles.queueCount}>
          {en.queueCount(count)}
        </Text>
        <Button appearance="subtle" icon={<ArrowClockwiseRegular />} onClick={onRefresh}>
          {en.refreshAction}
        </Button>
      </div>
      <QualificationQueueContent
        state={state}
        pendingRequestId={pendingRequestId}
        onQualify={onQualify}
      />
    </section>
  );
}
