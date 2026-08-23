import {
  Badge,
  Button,
  Card,
  Dropdown,
  MessageBar,
  MessageBarBody,
  Option,
  Spinner,
  Text,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import {
  ArrowClockwiseRegular,
  CheckmarkCircleRegular,
  ClipboardTaskListLtrRegular,
} from '@fluentui/react-icons';
import { startTransition, useState } from 'react';
import type { QualificationScenario } from '../http-qualification-adapter.js';
import {
  useQualificationQueue,
  useQualificationQueueState,
} from '../hooks/use-qualification-queue.js';
import { en } from '../locales/en.js';
import type {
  QualificationAdapter,
  QualificationQueueState,
  QueueItem,
} from '../qualification-queue.js';

export interface QualificationQueueAppProps {
  createAdapter: (scenario: QualificationScenario) => Promise<QualificationAdapter>;
  createCorrelationId: () => string;
  now: () => string;
  operator: { actorId: string; tenantId: string };
}

const scenarios: Array<{ label: string; value: QualificationScenario }> = [
  { value: 'normal', label: en.scenarioNormal },
  { value: 'empty', label: en.scenarioEmpty },
  { value: 'authorization', label: en.scenarioAuthorization },
  { value: 'service', label: en.scenarioService },
];

const useStyles = makeStyles({
  page: {
    minHeight: '100vh',
    color: tokens.colorNeutralForeground1,
    backgroundColor: tokens.colorNeutralBackground2,
    backgroundImage: `linear-gradient(135deg, ${tokens.colorNeutralBackground1} 0%, transparent 48%)`,
  },
  masthead: {
    minHeight: '68px',
    paddingLeft: '5vw',
    paddingRight: '5vw',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  brand: { display: 'flex', alignItems: 'center', columnGap: tokens.spacingHorizontalM },
  brandMark: {
    width: '38px',
    height: '38px',
    display: 'grid',
    placeItems: 'center',
    color: tokens.colorNeutralForegroundOnBrand,
    backgroundColor: tokens.colorBrandBackground,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    fontWeight: tokens.fontWeightSemibold,
  },
  intro: {
    padding: `52px 5vw ${tokens.spacingVerticalXXL}`,
    display: 'flex',
    alignItems: 'end',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalXXL,
    '@media (max-width: 820px)': { alignItems: 'stretch', flexDirection: 'column' },
  },
  sectionLabel: {
    display: 'block',
    marginBottom: tokens.spacingVerticalS,
    color: tokens.colorPaletteDarkOrangeForeground1,
    textTransform: 'uppercase',
    fontWeight: tokens.fontWeightSemibold,
  },
  title: {
    display: 'block',
    fontSize: '42px',
    lineHeight: '48px',
    fontWeight: tokens.fontWeightSemibold,
  },
  lede: {
    display: 'block',
    maxWidth: '610px',
    marginTop: tokens.spacingVerticalM,
    color: tokens.colorNeutralForeground2,
    lineHeight: tokens.lineHeightBase400,
  },
  scenarioField: {
    minWidth: '220px',
    display: 'grid',
    rowGap: tokens.spacingVerticalXS,
  },
  workspace: {
    padding: '0 5vw 64px',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(260px, 320px)',
    gap: tokens.spacingHorizontalXXL,
    '@media (max-width: 820px)': { gridTemplateColumns: '1fr' },
  },
  queuePanel: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderTop: `3px solid ${tokens.colorBrandStroke1}`,
    boxShadow: tokens.shadow4,
  },
  activityPanel: {
    padding: tokens.spacingHorizontalXL,
    backgroundColor: tokens.colorNeutralBackground1,
    borderTop: `3px solid ${tokens.colorPaletteDarkOrangeBorderActive}`,
    boxShadow: tokens.shadow4,
  },
  panelHeading: {
    minHeight: '72px',
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    '@media (max-width: 520px)': { alignItems: 'flex-start', flexWrap: 'wrap' },
  },
  panelTitle: { fontSize: tokens.fontSizeBase500, fontWeight: tokens.fontWeightSemibold },
  queueCount: { marginLeft: 'auto', color: tokens.colorNeutralForeground3 },
  queueState: {
    minHeight: '310px',
    padding: tokens.spacingHorizontalL,
    display: 'grid',
    alignContent: 'center',
  },
  requestList: { display: 'grid', gap: tokens.spacingVerticalS, alignSelf: 'start' },
  requestCard: {
    minHeight: '94px',
    display: 'grid',
    gridTemplateColumns: 'minmax(150px, 1fr) minmax(210px, 1.5fr) auto auto',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalXL,
    borderLeft: `4px solid ${tokens.colorPaletteDarkOrangeBorderActive}`,
    '@media (max-width: 820px)': { gridTemplateColumns: '1fr auto' },
    '@media (max-width: 520px)': { gridTemplateColumns: '1fr' },
  },
  requestIdentity: { display: 'grid', rowGap: tokens.spacingVerticalXXS },
  eyebrow: {
    color: tokens.colorPaletteDarkOrangeForeground1,
    textTransform: 'uppercase',
    fontWeight: tokens.fontWeightSemibold,
  },
  requestMeta: {
    margin: '0',
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    gap: `${tokens.spacingVerticalXXS} ${tokens.spacingHorizontalM}`,
    '@media (max-width: 820px)': { gridColumn: '1 / -1' },
    '@media (max-width: 520px)': { gridColumn: 'auto' },
  },
  metaTerm: { color: tokens.colorNeutralForeground3 },
  metaValue: { margin: '0', fontWeight: tokens.fontWeightSemibold },
  stateCenter: {
    justifyItems: 'center',
    textAlign: 'center',
    rowGap: tokens.spacingVerticalM,
  },
  stateCopy: { maxWidth: '480px', color: tokens.colorNeutralForeground2 },
  activityTitle: { display: 'block', marginBottom: tokens.spacingVerticalL },
  correlation: {
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
    display: 'grid',
    gap: tokens.spacingVerticalXS,
    borderTop: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
  },
  code: { overflowWrap: 'anywhere', color: tokens.colorBrandForeground1 },
  timeline: { marginTop: tokens.spacingVerticalL, paddingLeft: tokens.spacingHorizontalL },
  timelineItem: { paddingBottom: tokens.spacingVerticalL },
  timelineDetail: {
    display: 'block',
    marginTop: tokens.spacingVerticalXS,
    color: tokens.colorNeutralForeground3,
  },
  mobileAction: { '@media (max-width: 520px)': { width: '100%' } },
});

function RequestRow({
  item,
  pending,
  onQualify,
}: {
  item: QueueItem;
  pending: boolean;
  onQualify: () => void;
}) {
  const styles = useStyles();
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

function QueueState({
  state,
  pendingRequestId,
  onQualify,
}: {
  state: QualificationQueueState;
  pendingRequestId: string | null;
  onQualify: (requestId: string) => void;
}) {
  const styles = useStyles();
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
          <RequestRow
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

function ActivityPanel({ state }: { state: QualificationQueueState }) {
  const styles = useStyles();
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

export function QualificationQueueApp(props: QualificationQueueAppProps) {
  const styles = useStyles();
  const [scenario, setScenario] = useState<QualificationScenario>('normal');
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const queue = useQualificationQueue({ ...props, scenario });
  const state = useQualificationQueueState(queue);
  const count = state.status === 'ready' ? state.items.length : 0;
  const selectedScenario = scenarios.find((item) => item.value === scenario) ?? scenarios[0];

  const qualify = async (requestId: string) => {
    if (!queue) return;
    setPendingRequestId(requestId);
    await queue.qualify(requestId);
    setPendingRequestId(null);
  };

  return (
    <div className={styles.page}>
      <header className={styles.masthead}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>HC</span>
          <Text weight="semibold">{en.appName}</Text>
        </div>
        <Badge appearance="outline" color="warning">
          {en.pocLabel}
        </Badge>
      </header>
      <section className={styles.intro} aria-label={en.overviewLabel}>
        <div>
          <Text size={200} className={styles.sectionLabel}>
            {en.productOperations}
          </Text>
          <Text as="h1" className={styles.title}>
            {en.queueTitle}
          </Text>
          <Text size={400} className={styles.lede}>
            {en.queueDescription}
          </Text>
        </div>
        <label className={styles.scenarioField}>
          <Text weight="semibold" size={200}>
            {en.scenarioLabel}
          </Text>
          <Dropdown
            inlinePopup
            value={selectedScenario.label}
            selectedOptions={[scenario]}
            onOptionSelect={(_, data) =>
              startTransition(() => setScenario(data.optionValue as QualificationScenario))
            }
          >
            {scenarios.map((item) => (
              <Option key={item.value} value={item.value}>
                {item.label}
              </Option>
            ))}
          </Dropdown>
        </label>
      </section>
      <main className={styles.workspace}>
        <section className={styles.queuePanel} aria-labelledby="queue-heading">
          <div className={styles.panelHeading}>
            <Text as="h2" id="queue-heading" className={styles.panelTitle}>
              {en.queueTitle}
            </Text>
            <Text size={200} className={styles.queueCount}>
              {en.queueCount(count)}
            </Text>
            <Button
              appearance="subtle"
              icon={<ArrowClockwiseRegular />}
              onClick={() => void queue?.load()}
            >
              {en.refreshAction}
            </Button>
          </div>
          <QueueState
            state={state}
            pendingRequestId={pendingRequestId}
            onQualify={(requestId) => void qualify(requestId)}
          />
        </section>
        <ActivityPanel state={state} />
      </main>
    </div>
  );
}
