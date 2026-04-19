import ExcelJS from "exceljs";

export async function exportSimulationToExcel(sim: any, lines: any[], versionData?: any) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "FIRPLAK MarginOS";
  workbook.lastModifiedBy = "Commercial System";
  workbook.created = new Date();
  
  const sheet = workbook.addWorksheet("Simulación Comercial", {
    views: [{ showGridLines: false }]
  });

  // ========== ESTILOS COMUNES ==========
  const titleFont = { name: "Arial", size: 16, bold: true, color: { argb: "FF0E172C" } };
  const headerFont = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
  const labelFont = { name: "Arial", size: 10, bold: true, color: { argb: "FF475569" } };
  const valFont = { name: "Arial", size: 10, color: { argb: "FF0f172a" } };
  const moneyFmt = sim.currency === "USD" ? '"$"#,##0' : '"$"#,##0';
  const tableHeaderFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF020617" } };

  // 1. Logo / Headers placeholder
  sheet.mergeCells("A1:I2");
  const titleCell = sheet.getCell("A1");
  titleCell.value = "REPORTE COMERCIAL: SIMULACIÓN DE NEGOCIO";
  titleCell.font = titleFont;
  titleCell.alignment = { vertical: "middle", horizontal: "center" };

  // 2. Metadata details
  sheet.getCell("B4").value = "Fecha Generación:";
  sheet.getCell("B4").font = labelFont;
  sheet.getCell("C4").value = new Date().toLocaleString();
  sheet.getCell("C4").font = valFont;

  sheet.getCell("B5").value = "Cliente:";
  sheet.getCell("B5").font = labelFont;
  sheet.getCell("C5").value = sim.customers?.name || "N/A";
  sheet.getCell("C5").font = { ...valFont, bold: true };

  sheet.getCell("B6").value = "NIT:";
  sheet.getCell("B6").font = labelFont;
  sheet.getCell("C6").value = sim.customers?.nit || "N/A";
  sheet.getCell("C6").font = valFont;

  sheet.getCell("B7").value = "Contacto:";
  sheet.getCell("B7").font = labelFont;
  sheet.getCell("C7").value = sim.customers?.contact_name || "N/A";
  sheet.getCell("C7").font = valFont;

  sheet.getCell("E4").value = "Canal:";
  sheet.getCell("E4").font = labelFont;
  sheet.getCell("F4").value = sim.sales_channels?.name || "N/A";
  sheet.getCell("F4").font = valFont;

  sheet.getCell("E5").value = "Proyecto:";
  sheet.getCell("E5").font = labelFont;
  sheet.getCell("F5").value = sim.project_name || "N/A";
  sheet.getCell("F5").font = valFont;

  sheet.getCell("E6").value = "Moneda:";
  sheet.getCell("E6").font = labelFont;
  sheet.getCell("F6").value = sim.currency;
  sheet.getCell("F6").font = valFont;

  if (sim.currency === "USD") {
    sheet.getCell("E7").value = "TRM Asegurada:";
    sheet.getCell("E7").font = labelFont;
    sheet.getCell("F7").value = sim.trm || "N/A";
    sheet.getCell("F7").numFmt = "#,##0.00";
  }

  if (versionData) {
    sheet.getCell("H4").value = "Simulación Base:";
    sheet.getCell("H4").font = labelFont;
    sheet.getCell("I4").value = versionData.original_simulation_id ? versionData.original_simulation_id.split("-")[0].toUpperCase() : "N/A";
    sheet.getCell("I4").font = valFont;

    sheet.getCell("H5").value = "Tipo Versión:";
    sheet.getCell("H5").font = labelFont;
    sheet.getCell("I5").value = versionData.version_type === "COST_UPDATE" ? "Actualizada con Costos Vigentes" : "Clon Exacto";
    sheet.getCell("I5").font = { ...valFont, bold: true, color: { argb: versionData.version_type === "COST_UPDATE" ? "FF059669" : "FFD97706" } };
  }

  // 3. Table Headers
  const tableStartRow = 10;
  const headers = [
    "Código SAP", "Descripción", "Cantidad", "Precio Lista", 
    "% Dcto", "Precio Neto", "Costo MP", "Contribución", "Margen %"
  ];

  headers.forEach((h, colIndex) => {
    const cell = sheet.getCell(tableStartRow, colIndex + 1);
    cell.value = h;
    cell.font = headerFont;
    cell.fill = tableHeaderFill;
    cell.alignment = { vertical: "middle", horizontal: colIndex > 1 ? "right" : "left" };
    cell.border = {
        top: { style: "thin", color: { argb: "FF333333" } },
        bottom: { style: "thin", color: { argb: "FF333333" } },
    };
  });

  // 4. Columns mapping width
  sheet.columns = [
    { width: 15 },
    { width: 45 },
    { width: 12 },
    { width: 16 },
    { width: 12 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 12 },
  ];

  // 5. Fill Data
  let currRow = tableStartRow + 1;
  let totalIngreso = 0;
  let totalCosto = 0;
  let totalContrib = 0;

  for (const row of lines) {
    const r = sheet.getRow(currRow);
    r.getCell(1).value = row.sap_code;
    r.getCell(2).value = row.description;
    
    // Qty
    r.getCell(3).value = Number(row.qty);
    r.getCell(3).numFmt = "#,##0";
    
    // P Lista
    r.getCell(4).value = Number(row.list_price);
    r.getCell(4).numFmt = moneyFmt;
    
    // Dcto
    r.getCell(5).value = Number(row.discount_pct) / 100;
    r.getCell(5).numFmt = "0.0%";
    
    // P Neto Unitario
    const pNeto = Number(row.net_price);
    r.getCell(6).value = pNeto;
    r.getCell(6).numFmt = moneyFmt;

    // Costo MP Unitario (para mostrar total, multipliquemos qty o mostramos unitario?)
    // Request asked: "Costo MP, Contribución, Margen %". We assume row outputs match row inputs.
    r.getCell(7).value = Number(row.cost_mp);
    r.getCell(7).numFmt = moneyFmt;

    // Contribución is total in DB? Let's check DB schema... wait, the simulator saved "contribution_value" which is total contribution per line.
    r.getCell(8).value = Number(row.contribution_value);
    r.getCell(8).numFmt = moneyFmt;

    // Margen
    r.getCell(9).value = Number(row.margin_pct) / 100;
    r.getCell(9).numFmt = "0.0%";

    r.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (currRow % 2 === 0) {
           cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
        }
        cell.alignment = { vertical: "middle", horizontal: colNumber > 2 ? "right" : "left" };
        cell.border = {
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } }
        };
    });

    totalIngreso += (pNeto * Number(row.qty));
    totalCosto += (Number(row.cost_mp) * Number(row.qty));
    totalContrib += Number(row.contribution_value);

    currRow++;
  }

  // 6. Summary Totals (bottom right)
  currRow += 2;
  
  const grandMargen = totalIngreso > 0 ? (totalContrib / totalIngreso) : 0;

  const summaries = [
    { label: "Ingreso Neto Total:", val: totalIngreso, isMoney: true },
    { label: "Costo Total:", val: totalCosto, isMoney: true },
    { label: "Contribución Total:", val: totalContrib, isMoney: true },
    { label: "Margen Total:", val: grandMargen, isMoney: false, fmt: "0.0%" },
  ];

  for (const s of summaries) {
    sheet.getCell(currRow, 7).value = s.label;
    sheet.getCell(currRow, 7).font = labelFont;
    sheet.getCell(currRow, 7).alignment = { horizontal: "right" };

    sheet.getCell(currRow, 8).value = s.val;
    sheet.getCell(currRow, 8).numFmt = s.isMoney ? moneyFmt : (s.fmt || "General");
    sheet.getCell(currRow, 8).font = { ...valFont, bold: true };
    currRow++;
  }

  // File Writing
  const buf = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = window.URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  const simName = sim.project_name ? sim.project_name.replace(/[^a-zA-Z0-9]/g, "_") : "escenario";
  link.download = `Simulacion_${simName}_${new Date().getTime()}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
