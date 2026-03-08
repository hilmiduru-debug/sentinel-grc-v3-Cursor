/**
 * Field Agent - Voice-to-Action Feature
 * Feature-Sliced Design Public API
 */

export {
 clearDrafts, getRecentDrafts, getSeverityColor,
 getSeverityLabelTR, getSpeechRecognition, isSpeechRecognitionSupported, processVoiceTranscript, saveFindingDraft, simulateVoiceInput, convertDraftToFindingWithAI
} from './voice-engine';

export type {
 KeywordMatch, VoiceFindingDraft, VoiceProcessingResult, VoiceStatus,
 VoiceTranscript
} from './types';
