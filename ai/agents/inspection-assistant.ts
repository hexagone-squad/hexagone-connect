export interface InspectionAssistantInput {
  tenantId: string;
  inspectionId: string;
  question: string;
}

export interface InspectionAssistantOutput {
  answer: string;
  citations: string[];
  confidence: number;
  requiresHumanReview: boolean;
}
