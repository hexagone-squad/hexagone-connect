import { QualificationActivityPanel } from './qualification-activity-panel.js';
import { QualificationQueueHeader } from './qualification-queue-header.js';
import { QualificationQueuePanel } from './qualification-queue-panel.js';
import { useQualificationQueueStyles } from './qualification-queue.styles.js';
import type { QualificationQueuePageProps } from './qualification-queue.types.js';
import { useQualificationQueueViewModel } from './hooks/use-qualification-queue-view-model.js';

export function QualificationQueuePage(props: QualificationQueuePageProps) {
  const styles = useQualificationQueueStyles();
  const viewModel = useQualificationQueueViewModel(props);

  return (
    <div className={styles.page}>
      <QualificationQueueHeader
        scenario={viewModel.scenario}
        onScenarioChange={viewModel.setScenario}
      />
      <main className={styles.workspace}>
        <QualificationQueuePanel
          state={viewModel.state}
          pendingRequestId={viewModel.pendingRequestId}
          onQualify={(requestId) => void viewModel.qualifyRequest(requestId)}
          onRefresh={() => void viewModel.refresh()}
        />
        <QualificationActivityPanel state={viewModel.state} />
      </main>
    </div>
  );
}
