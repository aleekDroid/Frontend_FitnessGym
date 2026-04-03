// src/app/core/services/pdf-report.service.ts
import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DashboardSummary, DashboardReportItem } from './dashboard.service';

@Injectable({ providedIn: 'root' })
export class PdfReportService {

  private async loadImageAsBase64(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d')!.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  async generateReport(
    summary: DashboardSummary,
    data: DashboardReportItem[],
    dateFrom: string,
    dateTo: string
  ): Promise<void> {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pw = doc.internal.pageSize.width;
    const ph = doc.internal.pageSize.height;

    // ── Calculated Metrics ──────────────────────────────────────────────────
    const totalTx = data.length;
    const subscriptionTx = data.filter(t => t.type === 'suscripcion' || t.type === 'subscription');
    const productTx      = data.filter(t => t.type !== 'suscripcion' && t.type !== 'subscription');
    const avgTicket      = totalTx > 0 ? summary.totalIncome / totalTx : 0;
    const topProductMap  = new Map<string, number>();
    productTx.forEach(t => {
      topProductMap.set(t.description, (topProductMap.get(t.description) ?? 0) + t.total);
    });
    const topProduct = [...topProductMap.entries()].sort((a, b) => b[1] - a[1])[0];

    const paymentCount = data.reduce((acc, t) => {
      const m = t.paymentMethod.toUpperCase();
      acc[m] = (acc[m] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const bestPayment = Object.entries(paymentCount).sort((a, b) => b[1] - a[1])[0];

    // ── Helper Colors ───────────────────────────────────────────────────────
    const RED    = [216, 64, 64] as [number, number, number];
    const DARK   = [30, 24, 24]  as [number, number, number];
    const LGRAY  = [248, 248, 248] as [number, number, number];
    const MGRAY  = [200, 200, 200] as [number, number, number];
    const WHITE  = [255, 255, 255] as [number, number, number];

    const fmt = (n: number) => `$${n.toLocaleString('es-MX')}`;

    // ── Page 1: Cover Header ─────────────────────────────────────────────────
    // Dark header band
    doc.setFillColor(...DARK);
    doc.rect(0, 0, pw, 40, 'F');

    // Logo
    try {
      const logoB64 = await this.loadImageAsBase64('/assets/FitnessGym.PNG');
      doc.addImage(logoB64, 'PNG', 8, 5, 44, 30);
    } catch { /* no logo fallback */ }

    // Title text in header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...WHITE);
    doc.text('REPORTE DE INGRESOS', pw - 20, 18, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...MGRAY);
    doc.text(`Periodo: ${dateFrom} - ${dateTo}`, pw - 20, 25, { align: 'right' });
    doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, pw - 20, 30, { align: 'right' });

    // Red accent line
    doc.setDrawColor(...RED);
    doc.setLineWidth(0.8);
    doc.line(0, 40, pw, 40);

    // ── KPI Cards ────────────────────────────────────────────────────────────
    const kpis = [
      { label: 'Ingresos Totales',        value: fmt(summary.totalIncome),        sub: '' },
      { label: 'Miembros Activos',         value: `${summary.activeMembers}`,      sub: 'con membresía vigente' },
      { label: 'Suscripciones Vendidas',   value: `${summary.subscriptionsSold}`,  sub: fmt(summary.distribution.subscriptions) },
      { label: 'Productos Vendidos',        value: `${summary.productsSold}`,       sub: fmt(summary.distribution.products) },
    ];

    const cardW = (pw - 28 - 9) / 4;
    let cx = 14;
    const cy = 48;

    kpis.forEach((k) => {
      doc.setFillColor(...LGRAY);
      doc.roundedRect(cx, cy, cardW, 26, 2, 2, 'F');
      doc.setDrawColor(...RED);
      doc.setLineWidth(0.4);
      doc.line(cx, cy, cx + cardW, cy);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...DARK);
      doc.text(k.value, cx + cardW / 2, cy + 11, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(90, 90, 90);
      doc.text(k.label, cx + cardW / 2, cy + 17, { align: 'center', maxWidth: cardW - 4 });
      if (k.sub) doc.text(k.sub, cx + cardW / 2, cy + 21, { align: 'center' });

      cx += cardW + 3;
    });

    // ── Analytics Section ─────────────────────────────────────────────────
    const ay = cy + 34;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...DARK);
    doc.text('ANÁLISIS DEL PERIODO', 14, ay);

    doc.setDrawColor(...MGRAY);
    doc.setLineWidth(0.3);
    doc.line(14, ay + 2, pw - 14, ay + 2);

    const analytics = [
      { label: 'Transacciones totales',       value: `${totalTx}` },
      { label: 'Ticket promedio',              value: fmt(Math.round(avgTicket)) },
      { label: 'Tx de suscripciones',          value: `${subscriptionTx.length}` },
      { label: 'Tx de productos',              value: `${productTx.length}` },
      { label: 'Método más usado',             value: bestPayment ? bestPayment[0] : '—' },
      { label: 'Producto más vendido',         value: topProduct ? `${topProduct[0].substring(0, 20)} (${fmt(topProduct[1])})` : '—' },
    ];

    const colW = (pw - 28) / 3;
    analytics.forEach((a, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const ax = 14 + col * colW;
      const aRowY = ay + 8 + row * 12;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(110, 110, 110);
      doc.text(a.label, ax, aRowY);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...DARK);
      doc.text(a.value, ax, aRowY + 5);
    });

    // ── Desglose Row ──────────────────────────────────────────────────────
    const dy = ay + 38;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);

    const subsPct = summary.totalIncome > 0
      ? ((summary.distribution.subscriptions / summary.totalIncome) * 100).toFixed(1)
      : '0';
    const prodPct = summary.totalIncome > 0
      ? ((summary.distribution.products / summary.totalIncome) * 100).toFixed(1)
      : '0';

    doc.setFillColor(...LGRAY);
    doc.roundedRect(14, dy, pw - 28, 10, 1.5, 1.5, 'F');
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'bold');
    doc.text(`Desglose:`, 18, dy + 6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...RED);
    doc.text(`Suscripciones: ${fmt(summary.distribution.subscriptions)} (${subsPct}%)`, 45, dy + 6.5);
    doc.setTextColor(80, 80, 80);
    doc.text(`|`, 105, dy + 6.5);
    doc.setTextColor(60, 100, 180);
    doc.text(`Productos: ${fmt(summary.distribution.products)} (${prodPct}%)`, 110, dy + 6.5);

    // ── Transaction Tables ────────────────────────────────────────────────
    let currentY = dy + 16;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...DARK);
    doc.text('DETALLE DE SUSCRIPCIONES', 14, currentY);

    autoTable(doc, {
      startY: currentY + 4,
      head: [['#', 'Fecha', 'Tipo', 'Cliente', 'Descripción', 'Método', 'Total']],
      body: subscriptionTx.map((t, idx) => [
        idx + 1,
        new Date(t.date).toLocaleDateString('es-MX'),
        'Suscripción',
        t.client,
        t.description,
        t.paymentMethod.toUpperCase(),
        fmt(t.total),
      ]),
      headStyles: {
        fillColor: DARK,
        textColor: WHITE,
        fontStyle: 'bold',
        fontSize: 8.5,
        cellPadding: 3,
      },
      alternateRowStyles: { fillColor: LGRAY },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { cellWidth: 22 },
        2: { cellWidth: 24 },
        5: { halign: 'center', cellWidth: 20 },
        6: { halign: 'right', cellWidth: 22, fontStyle: 'bold' },
      },
      styles: { fontSize: 8, overflow: 'ellipsize', cellPadding: 2.5 },
      showFoot: 'lastPage',
      foot: [['', '', '', '', '', 'TOTAL', fmt(summary.distribution.subscriptions)]],
      footStyles: {
        fillColor: RED,
        textColor: WHITE,
        fontStyle: 'bold',
        fontSize: 9,
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 12;

    if (currentY > ph - 25) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...DARK);
    doc.text('DETALLE DE PRODUCTOS', 14, currentY);

    autoTable(doc, {
      startY: currentY + 4,
      head: [['#', 'Fecha', 'Tipo', 'Cliente', 'Descripción', 'Método', 'Total']],
      body: productTx.map((t, idx) => [
        idx + 1,
        new Date(t.date).toLocaleDateString('es-MX'),
        'Producto',
        t.client,
        t.description,
        t.paymentMethod.toUpperCase(),
        fmt(t.total),
      ]),
      headStyles: {
        fillColor: DARK,
        textColor: WHITE,
        fontStyle: 'bold',
        fontSize: 8.5,
        cellPadding: 3,
      },
      alternateRowStyles: { fillColor: LGRAY },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { cellWidth: 22 },
        2: { cellWidth: 24 },
        5: { halign: 'center', cellWidth: 20 },
        6: { halign: 'right', cellWidth: 22, fontStyle: 'bold' },
      },
      styles: { fontSize: 8, overflow: 'ellipsize', cellPadding: 2.5 },
      showFoot: 'lastPage',
      foot: [['', '', '', '', '', 'TOTAL', fmt(summary.distribution.products)]],
      footStyles: {
        fillColor: RED,
        textColor: WHITE,
        fontStyle: 'bold',
        fontSize: 9,
      },
    });


    // ── Footer on every page ──────────────────────────────────────────────
    const totalPages = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setDrawColor(...MGRAY);
      doc.setLineWidth(0.3);
      doc.line(14, ph - 12, pw - 14, ph - 12);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text('FITNESS GYM — Reporte Confidencial', 14, ph - 7);
      doc.text(`Pág. ${i} / ${totalPages}`, pw - 14, ph - 7, { align: 'right' });
    }

    doc.save(`Reporte_Gym_${dateFrom}_${dateTo}.pdf`);
  }
}
