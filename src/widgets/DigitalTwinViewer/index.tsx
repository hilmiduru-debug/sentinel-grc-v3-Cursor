/**
 * DigitalTwinViewer — Süreç Madenciliği Görselleştirme Widget'ı
 * widgets/DigitalTwinViewer/index.tsx  (Wave 66)
 *
 * C-Level Apple Glassmorphism tasarım, 100% Light Mode.
 */

import React, { useMemo } from 'react';
import ReactFlow, {
  Background, Controls, MiniMap,
  type Node, type Edge, BackgroundVariant
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion } from 'framer-motion';
import { Network, Activity, Clock, ShieldAlert, CheckCircle2 } from 'lucide-react';
import type { DigitalTwinModel, ProcessMiningLog } from '@/features/process-mining/api';

// ─── Prosedürel Renkler ───────────────────────────────────────────────────────

const NODE_COLORS: Record<string, string> = {
  'Şube': 'bg-blue-50 border-blue-300 text-blue-700',
  'Risk Yönetimi': 'bg-rose-50 border-rose-300 text-rose-700',
  'Tahsis': 'bg-amber-50 border-amber-300 text-amber-700',
  'Komite': 'bg-purple-50 border-purple-300 text-purple-700',
  'Operasyon': 'bg-emerald-50 border-emerald-300 text-emerald-700',
};

// ─── Custom Düğüm ─────────────────────────────────────────────────────────────

function ProcessStepNode({ data }: { data: any }) {
  const deptMatch = data.metadata?.dept ?? 'Operasyon';
  const colorClass = NODE_COLORS[deptMatch] ?? 'bg-slate-50 border-slate-300 text-slate-700';

  return (
    <div className={`rounded-xl border-2 px-3 py-2 shadow-md min-w-[160px] ${colorClass}`}>
      <div className="flex items-center gap-1.5 mb-1 opacity-70">
         <Network size={10} />
         <span className="text-[8px] font-black uppercase tracking-wider">{deptMatch}</span>
      </div>
      <p className="text-[10px] font-bold text-slate-800 leading-snug">{data.label}</p>
      {data.metadata?.sla_hrs && (
         <div className="mt-1.5 flex items-center justify-between text-[9px] font-bold opacity-80">
            <span>SLA:</span>
            <span>{data.metadata.sla_hrs} saat</span>
         </div>
      )}
    </div>
  );
}

const nodeTypes = { default: ProcessStepNode };

// ─── Arayüz ───────────────────────────────────────────────────────────────────

export function DigitalTwinViewer({
  model,
  logs,
}: {
  model: DigitalTwinModel | null;
  logs: ProcessMiningLog[];
}) {
  const nodes: Node[] = useMemo(() => {
    if (!model) return [];
    return (model.nodes_json || []).map((n) => ({
      ...n,
      type: 'default',
    }));
  }, [model]);

  // Edges'i process mining metriklerine göre kırmızılaştırma (darboğaz tespiti)
  const edges: Edge[] = useMemo(() => {
    if (!model) return [];

    // Darboğaz tespit edilen düğümleri bul
    const bottleneckNodes = new Set((logs || []).filter(l => l.bottleneck_node_id).map(l => l.bottleneck_node_id));

    return (model.edges_json || []).map((e) => {
      const isBottleneck = bottleneckNodes.has(e.target);
      return {
        ...e,
        animated: isBottleneck ? true : e.animated,
        style: isBottleneck ? { stroke: '#ef4444', strokeWidth: 3, opacity: 0.8 } : { stroke: '#94a3b8', strokeWidth: 2, opacity: 0.5 },
        label: isBottleneck ? 'Darboğaz' : e.data?.expected_time,
        labelStyle: { fill: isBottleneck ? '#ef4444' : '#64748b', fontWeight: 800, fontSize: 10 },
        labelBgStyle: { fill: '#ffffff', fillOpacity: 0.8, rx: 4, ry: 4 },
      };
    });
  }, [model, logs]);

  if (!model) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50/50">
        <Network size={40} className="text-slate-300 mb-3" />
        <p className="text-sm font-bold text-slate-500">Dijital İkiz Modeli Seçilmedi</p>
      </div>
    );
  }

  return (
    <div className="bg-white/70 backdrop-blur-lg border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[500px]">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-blue-900 to-indigo-900 flex items-center justify-between shadow-inner">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
            <Activity size={14} className="text-blue-300" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white">{model.name}</h3>
            <p className="text-[9px] text-blue-200/70">{model.process_code} · {model.department}</p>
          </div>
        </div>
        <div className="text-right">
           <span className="text-[9px] font-black text-blue-200/50 uppercase tracking-widest">SLA İDEAL SÜRE</span>
           <p className="text-sm font-black text-blue-300">{model.ideal_duration_hours} Saat</p>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 bg-slate-50">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-right"
          minZoom={0.2}
          maxZoom={1.5}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#cbd5e1" />
          <Controls className="bg-white border rounded-xl shadow-sm text-slate-600" />
          <MiniMap className="bg-white border text-blue-500 rounded-xl shadow-sm" maskColor="rgba(248, 250, 252, 0.7)" />
        </ReactFlow>
      </div>
    </div>
  );
}
