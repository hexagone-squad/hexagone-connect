import { Text } from '@fluentui/react-components';
import { en } from '../../locales/en.js';
import type { QualificationQueueState } from './model/qualification-queue.js';
import { useQualificationQueueStyles } from './qualification-queue.styles.js';

interface QualificationActivityPanelProps {
  state: QualificationQueueState;
}

export function QualificationActivityPanel({ state }: QualificationActivityPanelProps) {
  const styles = useQualificationQueueStyles();
  return (
    <aside className={styles.activityPanel}>
      <Text as="h2" size={500} weight="semibold" className={styles.activityTitle}>
        {en.auditTitle}
      </Text>
      {state.correlationId && (
        <div className={styles.correlation}>
          <Text size={200}>{en.correlationLabel}</Text>
          <code className={styles.code}>
            <Text size={200}>{state.correlationId}</Text>
          </code>
        </div>
      )}
      {state.auditEntries.length === 0 ? (
        <Text className={styles.stateCopy}>{en.auditEmpty}</Text>
      ) : (
        <ol className={styles.timeline}>
          {[...state.auditEntries].reverse().map((entry) => (
            <li className={styles.timelineItem} key={`${entry.resourceId}-${entry.occurredAt}`}>
              <Text weight="semibold">{en.auditAction}</Text>
              <Text size={200} className={styles.timelineDetail}>
                {entry.resourceId} / {entry.actorId}
              </Text>
              <time className={styles.timelineDetail}>
                <Text size={200}>{entry.occurredAt}</Text>
              </time>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
