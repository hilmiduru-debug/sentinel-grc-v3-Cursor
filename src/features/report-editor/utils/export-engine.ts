/**
 * Sentinel GRC v3.0 — Adli Dışa Aktarma Motoru (v3)
 *
 * exportToWord: Yapısal veri + HTML içeriğinden temiz kurumsal DOCX üretir.
 * exportToForensicPDF: HTML string'den (DOM bağımsız) adli mühürlü A4 PDF üretir.
 */
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import { saveAs } from 'file-saver';
import html2pdf from 'html2pdf.js';
import toast from 'react-hot-toast';
import { logReportExport } from '../api/export-audit';

// ─── Renk sabitleri ──────────────────────────────────────────────────────────
const C_BLUE  = '1E3A5F';
const C_DARK  = '1F2937';
const C_GREY  = '6B7280';
const C_LINE  = 'E5E7EB';

// ─── HTML → Temiz metin (paragraf bazlı) ─────────────────────────────────────

interface RunPair { text: string; bold?: boolean; italics?: boolean }

function walkNode(node: Node): RunPair[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const t = node.textContent || '';
    if (!t.trim()) return [];
    return [{ text: t }];
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return [];
  const el  = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  if (['script','style','nav','button','svg','input','select','textarea'].includes(tag)) return [];
  const kids = Array.from(el.childNodes).flatMap(walkNode);
  const b = tag === 'strong' || tag === 'b';
  const i = tag === 'em'     || tag === 'i';
  if (b || i) return kids.map(p => ({ ...p, bold: b || p.bold, italics: i || p.italics }));
  return kids;
}

function toRuns(pairs: RunPair[]): TextRun[] {
  return pairs.map(p => new TextRun({ text: p.text, bold: p.bold, italics: p.italics, font: 'Calibri', size: 22 }));
}

function htmlToDocxParagraphs(html: string): Paragraph[] {
  if (!html?.trim()) return [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const out: Paragraph[] = [];

  function walk(el: Element) {
    const tag = el.tagName.toLowerCase();
    if (['script','style','nav','button','svg','input','select','textarea'].includes(tag)) return;

    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      const level = tag === 'h1' ? HeadingLevel.HEADING_1 : tag === 'h2' ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3;
      const txt = el.textContent?.trim() || '';
      if (txt) out.push(new Paragraph({ text: txt, heading: level, spacing: { before: 360, after: 160 } }));
    } else if (tag === 'p') {
      const runs = toRuns(Array.from(el.childNodes).flatMap(walkNode));
      if (runs.length) out.push(new Paragraph({ children: runs, alignment: AlignmentType.JUSTIFIED, spacing: { after: 200, line: 360 } }));
    } else if (tag === 'li') {
      const runs = toRuns(Array.from(el.childNodes).flatMap(walkNode));
      out.push(new Paragraph({ children: [new TextRun({ text: '• ', bold: true, font: 'Calibri', size: 22 }), ...runs], indent: { left: 720 }, spacing: { after: 120 } }));
    } else if (tag === 'br') {
      out.push(new Paragraph({ children: [], spacing: { after: 80 } }));
    } else {
      Array.from(el.children).forEach(walk);
    }
  }

  Array.from(doc.body.children).forEach(walk);
  return out;
}

// ─── 1. Word (DOCX) Export ────────────────────────────────────────────────────

export const exportToWord = async (reportData: any, contentHtml: string) => {
  try {
    toast.loading('Word belgesi hazırlanıyor...', { id: 'docx-export' });

    const title   = reportData?.title   || 'İsimsiz Rapor';
    const reportId = reportData?.id     || 'Taslak';
    const dateStr  = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
    const es       = reportData?.executiveSummary;

    if (reportData?.id) {
      await logReportExport(reportData.id, 'DOCX').catch((e) => console.warn(e));
    }

    // İçerik: önce es.sections'dan al (yapısal), yoksa ham HTML
    const sectionsHtml = [
      es?.briefingNote      ? `<h2>YK Bilgilendirme Notu</h2><p>${es.briefingNote}</p>`              : '',
      es?.sections?.auditOpinion            ? `<h2>I. Denetim Görüşü</h2>${es.sections.auditOpinion}` : '',
      es?.sections?.criticalRisks           ? `<h2>II. Kritik Risk Alanları</h2>${es.sections.criticalRisks}` : '',
      es?.sections?.strategicRecommendations? `<h2>III. Stratejik Öneriler</h2>${es.sections.strategicRecommendations}` : '',
      es?.sections?.managementAction        ? `<h2>IV. Yönetim Eylemi</h2>${es.sections.managementAction}` : '',
      ...(es?.dynamicSections ?? []).map((s: any) => `<h2>${s.title}</h2>${s.content}`),
    ].filter(Boolean).join('\n');

    const finalHtml = sectionsHtml || contentHtml;
    const contentParas = htmlToDocxParagraphs(finalHtml);

    const doc = new Document({
      styles: {
        paragraphStyles: [
          { id: 'Normal',   name: 'Normal',   run: { font: 'Calibri', size: 22, color: C_DARK } },
          { id: 'Heading1', name: 'heading 1', basedOn: 'Normal', run: { font: 'Calibri', size: 32, bold: true, color: C_BLUE } },
          { id: 'Heading2', name: 'heading 2', basedOn: 'Normal', run: { font: 'Calibri', size: 26, bold: true, color: C_BLUE } },
          { id: 'Heading3', name: 'heading 3', basedOn: 'Normal', run: { font: 'Calibri', size: 24, bold: true, color: C_DARK } },
        ],
      },
      sections: [{
        properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
        headers: {
          default: new Header({
            children: [new Paragraph({
              children: [new TextRun({ text: `SENTINEL GRC v3.0  |  GİZLİ (CONFIDENTIAL)`, font: 'Calibri', size: 16, color: C_GREY })],
              border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C_BLUE } },
            })],
          }),
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              children: [new TextRun({ text: `${title}  |  Rapor ID: ${reportId}  |  ${dateStr}`, font: 'Calibri', size: 16, color: C_GREY })],
              alignment: AlignmentType.CENTER,
              border: { top: { style: BorderStyle.SINGLE, size: 6, color: C_LINE } },
            })],
          }),
        },
        children: [
          // Kapak
          new Paragraph({ children: [new TextRun({ text: 'SENTINEL GRC v3.0', font: 'Calibri', size: 20, color: C_GREY })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
          new Paragraph({ children: [new TextRun({ text: 'İÇ DENETİM RAPORU', font: 'Calibri', size: 36, bold: true, color: C_BLUE })], alignment: AlignmentType.CENTER, spacing: { after: 240 } }),
          new Paragraph({ children: [new TextRun({ text: title, font: 'Calibri', size: 28, bold: true, color: C_DARK })], alignment: AlignmentType.CENTER, spacing: { after: 480 } }),
          new Paragraph({ children: [new TextRun({ text: `Tarih: ${dateStr}`, font: 'Calibri', size: 20, color: C_GREY })], alignment: AlignmentType.CENTER, spacing: { after: 80 } }),
          new Paragraph({ children: [new TextRun({ text: `Rapor ID: ${reportId}`, font: 'Calibri', size: 20, italics: true, color: C_GREY })], alignment: AlignmentType.CENTER, spacing: { after: 960 } }),
          // Ayırıcı
          new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: C_BLUE } }, spacing: { after: 480 }, children: [] }),
          // İçerik bölümleri
          ...contentParas,
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Sentinel_Rapor_${title.replace(/[^a-z0-9ğüşıöçĞÜŞİÖÇ]/gi, '_')}.docx`);
    toast.success('Word belgesi başarıyla indirildi.', { id: 'docx-export' });
  } catch (error) {
    console.error('Word Export Error:', error);
    toast.error('Word dosyası oluşturulamadı.', { id: 'docx-export' });
  }
};

// ─── 2. Forensic PDF Export ───────────────────────────────────────────────────

/**
 * reportData'dan temiz HTML string üretir.
 * DOM bağımlılığı yok — html2pdf doğrudan bu string'den render eder.
 */
function buildPrintHTML(reportData: any): string {
  const title    = reportData?.title    || 'İsimsiz Rapor';
  const reportId = reportData?.id       || 'Bilinmiyor';
  const dateStr  = new Date().toLocaleString('tr-TR');
  const stamp    = `Sentinel GRC v3.0 — Gizli (Confidential) | Mühürlü Kopya | ID: ${reportId} | ${dateStr}`;
  const es       = reportData?.executiveSummary;

  const grade       = reportData?.report_grade  || es?.grade     || '—';
  const score       = reportData?.precise_score || es?.score     || 0;
  const assurance   = es?.assuranceLevel                         || '—';
  const briefing    = es?.briefingNote                           || '';
  const opinion     = es?.sections?.auditOpinion                 || '';
  const risks       = es?.sections?.criticalRisks                || '';
  const recs        = es?.sections?.strategicRecommendations     || '';
  const mgmt        = es?.sections?.managementAction             || '';
  const dynamic     = (es?.dynamicSections ?? []) as { title: string; content: string }[];

  const sectionHtml = (label: string, html: string) =>
    html?.trim()
      ? `<div class="section"><h2>${label}</h2>${html}</div>`
      : '';

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Arial', sans-serif; color: #1F2937; background: #fff; font-size: 11pt; line-height: 1.7; }
  .header-band { background: #1E3A5F; color: white; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; }
  .header-band .title { font-size: 14pt; font-weight: 700; margin-top: 4px; }
  .header-band .meta { font-size: 9pt; opacity: 0.85; }
  .header-band .sub { font-size: 9pt; opacity: 0.65; margin-bottom: 4px; letter-spacing: 1px; text-transform: uppercase; }
  .content { padding: 24px 32px; }
  .score-row { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
  .score-card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 16px; min-width: 100px; }
  .score-card .label { font-size: 8pt; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; }
  .score-card .value { font-size: 18pt; font-weight: 700; color: #1E3A5F; }
  .briefing-box { background: #F0F4FF; border-left: 4px solid #1E3A5F; border-radius: 4px; padding: 12px 16px; margin-bottom: 20px; font-size: 10.5pt; color: #1F2937; }
  .section { margin-bottom: 20px; }
  h2 { font-size: 12pt; font-weight: 700; color: #1E3A5F; border-bottom: 1px solid #E5E7EB; padding-bottom: 4px; margin-bottom: 10px; }
  p { margin-bottom: 8px; text-align: justify; }
  li { margin-left: 20px; margin-bottom: 4px; }
  strong { color: #111827; }
  .footer-stamp { position: fixed; bottom: 0; left: 0; right: 0; background: #F9FAFB; border-top: 2px solid #1E3A5F; padding: 6px 24px; font-size: 7.5pt; color: #6B7280; text-align: center; }
  @media print { .footer-stamp { position: fixed; bottom: 0; } }
</style>
</head>
<body>
  <div class="header-band">
    <div>
      <div class="sub">Sentinel GRC v3.0 — İç Denetim Raporu</div>
      <div class="title">${title}</div>
    </div>
    <div style="text-align:right">
      <div class="meta">Rapor ID: ${reportId}</div>
      <div class="meta">GİZLİ — CONFIDENTIAL</div>
    </div>
  </div>

  <div class="content">
    <div class="score-row">
      <div class="score-card"><div class="label">Hassas Skor</div><div class="value">${score}</div></div>
      <div class="score-card"><div class="label">Not</div><div class="value">${grade}</div></div>
      <div class="score-card"><div class="label">Güvence</div><div class="value" style="font-size:11pt">${assurance}</div></div>
    </div>

    ${briefing ? `<div class="briefing-box">${briefing}</div>` : ''}
    ${sectionHtml('I. Denetim Görüşü', opinion)}
    ${sectionHtml('II. Kritik Risk Alanları', risks)}
    ${sectionHtml('III. Stratejik Öneriler', recs)}
    ${sectionHtml('IV. Yönetim Eylemi', mgmt)}
    ${dynamic.map((s) => sectionHtml(s.title, s.content)).join('\n')}
  </div>

  <div class="footer-stamp">${stamp}</div>
</body>
</html>`;
}

export const exportToForensicPDF = async (reportData: any, _el?: HTMLElement) => {
  try {
    toast.loading('Adli Mühürlü PDF oluşturuluyor...', { id: 'pdf-export' });

    const title = reportData?.title || 'Rapor';

    if (reportData?.id) {
      await logReportExport(reportData.id, 'PDF').catch((e) => console.warn(e));
    }

    const htmlString = buildPrintHTML(reportData);

    const opt = {
      margin:    [0, 0, 12, 0] as [number, number, number, number],
      filename:  `Sentinel_Rapor_${title.replace(/[^a-z0-9ğüşıöçĞÜŞİÖÇ]/gi, '_')}_Muhurlu.pdf`,
      image:     { type: 'jpeg' as 'jpeg', quality: 0.97 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF:     { unit: 'mm', format: 'a4', orientation: 'portrait' as 'portrait' },
    };

    await html2pdf().set(opt).from(htmlString).save();
    toast.success('Adli mühürlü PDF oluşturuldu.', { id: 'pdf-export' });
  } catch (error) {
    console.error('Forensic PDF Export Error:', error);
    toast.error('PDF dosyası oluşturulamadı.', { id: 'pdf-export' });
  }
};
