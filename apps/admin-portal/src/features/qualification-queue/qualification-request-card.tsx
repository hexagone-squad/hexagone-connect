import { Badge, Button, Card, Text } from '@fluentui/react-components';
import { CheckmarkCircleRegular } from '@fluentui/react-icons';
import { en } from '../../locales/en.js';
import type { QueueItem } from '../../qualification-queue.js';
import { useQualificationQueueStyles } from './qualification-queue.styles.js';

interface QualificationRequestCardProps {
  item: QueueItem;
  pending: boolean;
  onQualify: () => void;
}

export function QualificationRequestCard({
  item,
  pending,
  onQualify,
}: QualificationRequestCardProps) {
  const styles = useQualificationQueueStyles();
  return (
    <article>
      <Card className={styles.requestCard} appearance="outline">
        <div className={styles.requestIdentity}>
          <Text size={200} className={styles.eyebrow}>
            {en.requestLabel}
          </Text>
          <Text weight="semibold" size={400}>
            {item.id}
          </Text>
        </div>
        <dl className={styles.requestMeta}>
          <dt className={styles.metaTerm}>
            <Text size={200}>{en.serviceCategoryLabel}</Text>
          </dt>
          <dd className={styles.metaValue}>
            <Text size={200}>{item.serviceCategory}</Text>
          </dd>
          <dt className={styles.metaTerm}>
            <Text size={200}>{en.tenantLabel}</Text>
          </dt>
          <dd className={styles.metaValue}>
            <Text size={200}>{item.tenantId}</Text>
          </dd>
        </dl>
        <Badge appearance="outline" color="success">
          {en.statusSubmitted}
        </Badge>
        <Button
          className={styles.mobileAction}
          appearance="primary"
          icon={<CheckmarkCircleRegular />}
          disabled={pending}
          onClick={onQualify}
        >
          {en.qualifyAction}
        </Button>
      </Card>
    </article>
  );
}
