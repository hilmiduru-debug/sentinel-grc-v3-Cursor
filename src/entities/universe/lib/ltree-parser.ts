import type { UniverseNode } from '../model/types';

// ─── Ağaç Kurulum Fonksiyonları ───────────────────────────────────────────────

export function buildHierarchyFromLTree(flatData: UniverseNode[]): UniverseNode[] {
  const sorted = [...flatData].sort((a, b) => {
    const aDepth = (a?.path ?? '').split('.').length;
    const bDepth = (b?.path ?? '').split('.').length;
    return aDepth !== bDepth ? aDepth - bDepth : (a?.path ?? '').localeCompare(b?.path ?? '');
  });

  const nodeMap = new Map<string, UniverseNode>();
  const roots: UniverseNode[] = [];

  for (const raw of sorted) {
    if (!raw?.path) continue; // Savunmacı: path null/undefined ise atla
    const node: UniverseNode = { ...raw, children: [] };
    nodeMap.set(node.path, node);

    const parts = node.path.split('.');
    if (parts.length <= 1) {
      roots.push(node);
    } else {
      const parentPath = parts.slice(0, -1).join('.');
      const parent = nodeMap.get(parentPath);
      if (parent) {
        parent.children = parent.children ?? [];
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }
  }

  return roots;
}

export function flattenTree(nodes: UniverseNode[]): UniverseNode[] {
  const result: UniverseNode[] = [];
  const traverse = (node: UniverseNode): void => {
    result.push(node);
    (node?.children || []).forEach(traverse); // Savunmacı: || []
  };
  (nodes || []).forEach(traverse); // Savunmacı: || []
  return result;
}

// ─── ltree Yardımcı Fonksiyonları ─────────────────────────────────────────────

/**
 * Bir ltree path'in derinliğini döndürür.
 * Örn: 'root.bank.unit_a' → 3
 */
export function getPathDepth(path: string): number {
  if (!path) return 0;
  return path.split('.').length;
}

/**
 * Bir ltree path'in tüm ata path'lerini döndürür.
 * Örn: 'root.bank.unit_a' → ['root', 'root.bank']
 */
export function getAncestorPaths(path: string): string[] {
  if (!path) return [];
  const parts = path.split('.');
  const ancestors: string[] = [];
  for (let i = 1; i < parts.length; i++) {
    ancestors.push(parts.slice(0, i).join('.'));
  }
  return ancestors;
}

/**
 * Bir path'in doğrudan ebeveyninin path'ini döndürür.
 * Örn: 'root.bank.unit_a' → 'root.bank'
 * Kök node için null döner.
 */
export function getParentPath(path: string): string | null {
  if (!path) return null;
  const parts = path.split('.');
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join('.');
}

/**
 * Bir path'in başka bir path'in torununa ait olup olmadığını kontrol eder (ltree <@ simülasyonu).
 * Örn: isDescendant('root.bank.unit', 'root.bank') → true
 */
export function isDescendant(childPath: string, parentPath: string): boolean {
  if (!childPath || !parentPath) return false;
  return childPath.startsWith(parentPath + '.') || childPath === parentPath;
}

/**
 * Tüm düğümleri verilen maksimum derinliğe kadar filtreler.
 */
export function filterByDepth(nodes: UniverseNode[], maxDepth: number): UniverseNode[] {
  return (nodes || []).filter((n) => getPathDepth(n?.path ?? '') <= maxDepth);
}
