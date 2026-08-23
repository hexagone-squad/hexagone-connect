import { Badge, Dropdown, Option, Text } from '@fluentui/react-components';
import type { QualificationScenario } from './adapters/http-qualification-adapter.js';
import { en } from '../../locales/en.js';
import { qualificationScenarioOptions } from './qualification-queue.options.js';
import { useQualificationQueueStyles } from './qualification-queue.styles.js';

interface QualificationQueueHeaderProps {
  scenario: QualificationScenario;
  onScenarioChange: (scenario: QualificationScenario) => void;
}

export function QualificationQueueHeader({
  scenario,
  onScenarioChange,
}: QualificationQueueHeaderProps) {
  const styles = useQualificationQueueStyles();
  const selectedScenario =
    qualificationScenarioOptions.find((item) => item.value === scenario) ??
    qualificationScenarioOptions[0];

  return (
    <>
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
              onScenarioChange(data.optionValue as QualificationScenario)
            }
          >
            {qualificationScenarioOptions.map((item) => (
              <Option key={item.value} value={item.value}>
                {item.label}
              </Option>
            ))}
          </Dropdown>
        </label>
      </section>
    </>
  );
}
