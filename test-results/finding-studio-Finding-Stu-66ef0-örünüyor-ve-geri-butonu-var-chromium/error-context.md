# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]: "!"
      - generic [ref=e7]: Sistem Hatasi / System Error
    - generic [ref=e8]:
      - paragraph [ref=e9]: Uygulama beklenmeyen bir hata ile karsilasti. Asagidaki detaylari inceleyebilirsiniz.
      - code [ref=e11]: "Failed to fetch dynamically imported module: http://localhost:5173/src/pages/findings/FindingStudioPage.tsx?t=1772979057595"
      - group [ref=e12]:
        - generic "Component Stack" [ref=e13] [cursor=pointer]
      - generic [ref=e14]:
        - button "Sayfayi Yenile" [ref=e15] [cursor=pointer]
        - button "Yoksay / Dismiss" [ref=e16] [cursor=pointer]
  - generic [ref=e19]:
    - generic [ref=e20]: "[plugin:vite:import-analysis] Failed to resolve import \"@/entities/finding/api/mock-comprehensive-data\" from \"src/features/finding-studio/hooks/useFindingStudio.ts\". Does the file exist?"
    - generic [ref=e21]: /Users/hilmiduru/Documents/Sentinel v3.0 Cursor/sentinel_v3.0/src/features/finding-studio/hooks/useFindingStudio.ts:9:42
    - generic [ref=e22]: "5 | import { useMethodologyStore } from \"@/features/admin/methodology/model/store\"; 6 | import { useRiskConfigStore } from \"@/features/admin/risk-configuration/model/store\"; 7 | import { mockComprehensiveFindings } from \"@/entities/finding/api/mock-comprehensive-data\"; | ^ 8 | import { 9 | fetchFinding,"
    - generic [ref=e23]: at TransformPluginContext._formatError (file:///Users/hilmiduru/Documents/Sentinel%20v3.0%20Cursor/sentinel_v3.0/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:49258:41) at TransformPluginContext.error (file:///Users/hilmiduru/Documents/Sentinel%20v3.0%20Cursor/sentinel_v3.0/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:49253:16) at normalizeUrl (file:///Users/hilmiduru/Documents/Sentinel%20v3.0%20Cursor/sentinel_v3.0/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:64307:23) at process.processTicksAndRejections (node:internal/process/task_queues:104:5) at async file:///Users/hilmiduru/Documents/Sentinel%20v3.0%20Cursor/sentinel_v3.0/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:64439:39 at async Promise.all (index 6) at async TransformPluginContext.transform (file:///Users/hilmiduru/Documents/Sentinel%20v3.0%20Cursor/sentinel_v3.0/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:64366:7) at async PluginContainer.transform (file:///Users/hilmiduru/Documents/Sentinel%20v3.0%20Cursor/sentinel_v3.0/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:49099:18) at async loadAndTransform (file:///Users/hilmiduru/Documents/Sentinel%20v3.0%20Cursor/sentinel_v3.0/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:51978:27) at async viteTransformMiddleware (file:///Users/hilmiduru/Documents/Sentinel%20v3.0%20Cursor/sentinel_v3.0/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:62106:24
    - generic [ref=e24]:
      - text: Click outside, press Esc key, or fix the code to dismiss.
      - text: You can also disable this overlay by setting
      - code [ref=e25]: server.hmr.overlay
      - text: to
      - code [ref=e26]: "false"
      - text: in
      - code [ref=e27]: vite.config.ts
      - text: .
```