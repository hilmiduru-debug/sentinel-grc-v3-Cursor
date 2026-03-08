export { ExecSummaryGenerator } from './ExecSummaryGenerator';
export {
 fetchActiveEngagements,
 fetchEngagementFindings, fetchEngagementReportData, generateFindingsTableHTML,
 generateStatisticsSummaryHTML
} from './integration';
export type {
 EngagementDetails, EngagementReportData, FindingData,
 ReportStatistics
} from './integration';

export { ReportAmendmentModal } from './ui/ReportAmendmentModal';
export { SignaturePanel } from './ui/SignaturePanel';

export {
 addSignature,
 approveReport,
 approveWithDissent, createReportSnapshot, getNextSignatureStep, getReportSignatures, getReportSnapshot, getSignatureChainStatus, getSignatureWorkflow, publishReport, rejectReport
} from './api/signature-api';

export {
 canPublishReport, captureReportSnapshot,
 freezeReport, isReportFrozen, loadFrozenReport
} from './lib/snapshot-engine';
