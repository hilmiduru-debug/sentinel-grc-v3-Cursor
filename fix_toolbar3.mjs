import fs from 'fs';
const filepath = 'src/features/report-editor/ui/LiquidGlassToolbar.tsx';
let content = fs.readFileSync(filepath, 'utf8');

if (!content.includes("import { logReportExport }")) {
    content = content.replace(
        "import { SearchPalette } from './SearchPalette';",
        "import { SearchPalette } from './SearchPalette';\nimport { logReportExport } from '../api/export-audit';"
    );
}

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
console.log('Fixed toolbar');
