/**
 * Neural Map - Risk Contagion Visualization
 * Feature-Sliced Design Public API
 */

export { calculateContagion, calculateNetworkStats, getRiskColor, getRiskLevelTR } from './engine';
export type { ContagionResult, NetworkStats, NeuralEdge, NeuralMapState, NeuralNode } from './types';
