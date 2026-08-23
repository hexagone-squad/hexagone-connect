import type { QualificationScenario } from '../../http-qualification-adapter.js';
import { en } from '../../locales/en.js';

export const qualificationScenarioOptions: ReadonlyArray<{
  label: string;
  value: QualificationScenario;
}> = [
  { value: 'normal', label: en.scenarioNormal },
  { value: 'empty', label: en.scenarioEmpty },
  { value: 'authorization', label: en.scenarioAuthorization },
  { value: 'service', label: en.scenarioService },
];
