/**
 * React Query hook for BudgetTrackerCard: engagement budget summary + auditor costs.
 * FSD: data layer; no mock — all from Supabase.
 */

import { useQuery } from '@tanstack/react-query';
import {
 getEngagementAuditorCosts,
 getEngagementBudgetSummary,
 type BudgetSummary,
 type EngagementAuditorCost,
} from '../time-tracking';

const DEFAULT_HOURLY_FOR_ALLOCATED = 1500;

export function useEngagementBudgetCard(engagementId: string | undefined) {
 const budgetQ = useQuery({
 queryKey: ['engagement-budget-summary', engagementId],
 queryFn: () => getEngagementBudgetSummary(engagementId!),
 enabled: !!engagementId,
 });

 const costsQ = useQuery({
 queryKey: ['engagement-auditor-costs', engagementId],
 queryFn: () => getEngagementAuditorCosts(engagementId!),
 enabled: !!engagementId,
 });

 const budget: BudgetSummary | undefined = budgetQ.data ?? undefined;
 const auditorCosts: EngagementAuditorCost[] = costsQ.data ?? [];
 const allocatedBudget =
 budget != null
 ? budget.estimated_hours * DEFAULT_HOURLY_FOR_ALLOCATED
 : undefined;

 return {
 budget,
 auditorCosts,
 allocatedBudget,
 isLoading: budgetQ.isLoading || costsQ.isLoading,
 isError: budgetQ.isError || costsQ.isError,
 refetch: () => {
 budgetQ.refetch();
 costsQ.refetch();
 },
 };
}
