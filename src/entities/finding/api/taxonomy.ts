import { supabase } from '@/shared/api/supabase';
import { useQuery } from '@tanstack/react-query';

export interface TaxonomyData {
 categories: string[];
 departments: string[];
 riskTypes: Array<{ id: string; label: string; icon: string }>;
 processes: Array<{ id: string; label: string; subprocesses: string[] }>;
 controls: Array<{ id: string; title: string; category: string }>;
}

/**
 * Fetches distinct taxonomy data from rkm_risks table for the Finding Form.
 */
async function fetchTaxonomy(): Promise<TaxonomyData> {
 const { data, error } = await supabase
 .from('rkm_risks')
 .select('id, risk_code, risk_title, risk_owner, risk_category, main_process, sub_process, control_type');

 if (error) throw error;

 const rows = data || [];

 // Extract distinct categories
 const categorySet = new Set<string>();
 const departmentSet = new Set<string>();
 const processMap = new Map<string, Set<string>>();
 const controls: TaxonomyData['controls'] = [];
 const riskTypeSet = new Set<string>();

 rows.forEach((r) => {
 if (r.risk_category) {
 categorySet.add(r.risk_category);
 riskTypeSet.add(r.risk_category);
 }
 if (r.risk_owner) departmentSet.add(r.risk_owner);

 if (r.main_process) {
 if (!processMap.has(r.main_process)) {
 processMap.set(r.main_process, new Set<string>());
 }
 if (r.sub_process) {
 processMap.get(r.main_process)!.add(r.sub_process);
 }
 }

 if (r.risk_code && r.risk_title) {
 // Treat risks/controls interchangeably based on the requirement for FindingFormWidget 'CONTROLS'
 controls.push({
 id: r.risk_code,
 title: r.risk_title,
 category: r.control_type || 'Preventive',
 });
 }
 });

 const categories = Array.from(categorySet);
 const departments = Array.from(departmentSet);
 
 // Format Processes
 const processes = Array.from(processMap.entries()).map(([processName, subSet], index) => ({
 id: `P${index + 1}`,
 label: processName,
 subprocesses: Array.from(subSet),
 }));

 // Map risk types to icons
 const ICONS = ['💳', '📊', '⚙️', '💧', '⚖️', '🎯', '🛡️'];
 const riskTypes = Array.from(riskTypeSet).map((rt, idx) => ({
 id: rt.toLowerCase().replace(/\s+/g, '-'),
 label: rt,
 icon: ICONS[idx % ICONS.length],
 }));

 return {
 categories,
 departments,
 processes,
 controls,
 riskTypes,
 };
}

export function useFindingTaxonomy() {
 return useQuery({
 queryKey: ['finding-taxonomy'],
 queryFn: fetchTaxonomy,
 staleTime: 5 * 60 * 1000, // 5 minutes
 });
}
