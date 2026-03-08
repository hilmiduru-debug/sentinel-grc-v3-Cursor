const fs = require('fs');
const filepath = 'src/features/report-editor/ui/LiquidGlassToolbar.tsx';
let content = fs.readFileSync(filepath, 'utf8');

if (!content.includes("import { logReportExport } from '../api/export-audit';")) {
    content = content.replace(
        "import { SearchPalette } from './SearchPalette';",
        "import { SearchPalette } from './SearchPalette';\nimport { logReportExport } from '../api/export-audit';"
    );
}

// target 1: PDF export
const pdfStr = "toast.success('Dosya başarıyla indirildi');";
const pdfReplace = "toast.success('Dosya başarıyla indirildi');\n      // Fire and forget audit log\n      logReportExport(activeReport.id, 'PDF');";
if (content.includes("URL.revokeObjectURL")) {
    // Only replace the first occurrence (PDF)
    content = content.replace(pdfStr, pdfReplace);
}

// target 2: Word export
const wordStr = "toast.success('Dosya başarıyla indirildi');";
const wordReplace = "toast.success('Dosya başarıyla indirildi');\n      // Fire and forget audit log\n      logReportExport(activeReport.id, 'DOCX');";
// Wait, replacing 'toast.success' again will replace the second one
// Actually let's use a regex
let count = 0;
content = content.replace(/toast\.success\('Dosya başarıyla indirildi'\);/g, (match) => {
    count++;
    if (count === 1) {
        return "toast.success('Dosya başarıyla indirildi');\n      // Fire and forget audit log\n      logReportExport(activeReport.id, 'PDF');";
    } else if (count === 2) {
        return "toast.success('Dosya başarıyla indirildi');\n      // Fire and forget audit log\n      logReportExport(activeReport.id, 'DOCX');";
    }
    return match;
});

fs.writeFileSync(filepath, content);
console.log('Fixed');
