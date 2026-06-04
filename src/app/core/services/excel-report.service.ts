import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { DashboardSummary, DashboardReportItem } from './dashboard.service';

@Injectable({ providedIn: 'root' })
export class ExcelReportService {

  generateExcelReport(
    summary: DashboardSummary,
    data: DashboardReportItem[],
    dateFrom: string,
    dateTo: string
  ): void {
    
    const excelData = data.map((t, index) => ({
      'No.': index + 1,
      'Fecha': new Date(t.date).toLocaleDateString('es-MX'),
      'Tipo': (t.type === 'suscripcion' || t.type === 'subscription') ? 'Suscripción' : 'Producto',
      'Cliente': t.client,
      'Descripción': t.description,
      'Método de Pago': t.paymentMethod.toUpperCase(),
      'Total ($)': t.total
    }));

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(excelData);

    worksheet['!cols'] = [
      { wch: 5 },  // No.
      { wch: 12 }, // Fecha.
      { wch: 15 }, // Tipo.
      { wch: 20 }, // Cliente.
      { wch: 30 }, // Descripción.
      { wch: 15 }, // Método.
      { wch: 10 }  // Total.
    ];

    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transacciones');

    XLSX.writeFile(workbook, `Reporte_Gym_${dateFrom}_${dateTo}.xlsx`);
  }
}