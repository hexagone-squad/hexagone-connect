import { MessageBar, MessageBarBody, Spinner, Text } from '@fluentui/react-components';
import { ClipboardTaskListLtrRegular } from '@fluentui/react-icons';
import { en } from '../../locales/en.js';
import type { QualificationQueueState } from '../../qualification-queue.js';
import { useQualificationQueueStyles } from './qualification-queue.styles.js';
import { QualificationRequestCard } from './qualification-request-card.js';

interface QualificationQueueContentProps {
  state: QualificationQueueState;
  pendingRequestId: string | null;
  onQualify: (requestId: string) => void;
}

export function QualificationQueueContent({
  state,
  pendingRequestId,
  onQualify,
}: QualificationQueueContentProps) {
  const styles = useQualificationQueueStyles();
  if (state.status === 'loading' || state.status === 'idle') {
    return (
      <div className={`${styles.queueState} ${styles.stateCenter}`} aria-live="polite">
        <Spinner label={en.loading} />
      </div>
    );
  }
  if (state.status === 'error') {
    const message =
      state.error === 'authorization'
        ? en.errorAuthorization
        : state.error === 'validation'
          ? en.errorValidation
          : en.errorService;
    return (
      <div className={styles.queueState}>
        <MessageBar intent="error" role="alert">
          <MessageBarBody>
            <strong>{en.actionRequired}</strong> {message}
          </MessageBarBody>
        </MessageBar>
      </div>
    );
  }
  if (state.items.length === 0) {
    return (
      <div className={`${styles.queueState} ${styles.stateCenter}`} aria-live="polite">
        <ClipboardTaskListLtrRegular fontSize={36} aria-hidden="true" />
        <Text as="h2" size={500} weight="semibold">
          {en.emptyTitle}
        </Text>
        <Text className={styles.stateCopy}>
          {state.correlationId ? en.emptyAfterAction : en.emptyBody}
        </Text>
      </div>
    );
  }
  return (
    <div className={styles.queueState} aria-live="polite">
      <div className={styles.requestList}>
        {state.items.map((item) => (
          <QualificationRequestCard
            key={item.id}
            item={item}
            pending={pendingRequestId === item.id}
            onQualify={() => onQualify(item.id)}
          />
        ))}
      </div>
    </div>
  );
}
