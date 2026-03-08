import fs from 'fs';
const filepath = 'src/features/report-editor/ui/LiquidGlassToolbar.tsx';
let content = fs.readFileSync(filepath, 'utf8');

content = content.replace(
  "toast.success('Dosya başarıyla indirildi');\n  } catch (err: any) {",
  "toast.success('Dosya başarıyla indirildi');\n  logReportExport(activeReport.id, 'PDF');\n  } catch (err: any) {"
);

content = content.replace(
  "await new Promise(r => setTimeout(r, 1500));\n  toast.success('Dosya başarıyla indirildi');\n  } catch (err: any) {",
  "await new Promise(r => setTimeout(r, 1500));\n  toast.success('Dosya başarıyla indirildi');\n  logReportExport(activeReport.id, 'DOCX');\n  } catch (err: any) {"
);

fs.writeFileSync(filepath, content);
console.log('Fixed');
