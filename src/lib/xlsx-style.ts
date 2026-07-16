// Styles partagés pour les exports Excel (xlsx-js-style — seul fork qui écrit
// réellement les styles dans le .xlsx, la lib "xlsx" de base les ignore).
import { utils } from 'xlsx-js-style';

const BORDER_COLOR = 'D0D5DD';
const THIN = { style: 'thin', color: { rgb: BORDER_COLOR } } as const;
export const CELL_BORDER = { top: THIN, bottom: THIN, left: THIN, right: THIN };

function cellAt(ws: any, r: number, c: number) {
  const addr = utils.encode_cell({ r, c });
  if (!ws[addr]) ws[addr] = { t: 's', v: '' };
  return ws[addr];
}

/** Bandeau titre (logo/adresse) : gras, coloré, sans bordure. */
export function styleBandRow(ws: any, rowIdx: number, numCols: number, size = 10) {
  for (let c = 0; c < numCols; c++) {
    cellAt(ws, rowIdx, c).s = {
      font: { bold: true, sz: size, color: { rgb: '166534' } },
    };
  }
}

/** Ligne d'en-têtes de colonnes : fond vert PSI, texte blanc, bordures. */
export function styleHeaderRow(ws: any, rowIdx: number, numCols: number) {
  for (let c = 0; c < numCols; c++) {
    cellAt(ws, rowIdx, c).s = {
      font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '4CAF4F' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: CELL_BORDER,
    };
  }
}

/** Lignes de données : bordures fines sur toutes les cellules + zébrage + retour à la ligne. */
export function styleDataRows(ws: any, rowStart: number, rowEnd: number, numCols: number) {
  for (let r = rowStart; r <= rowEnd; r++) {
    const zebra = (r - rowStart) % 2 === 1;
    for (let c = 0; c < numCols; c++) {
      const cell = cellAt(ws, r, c);
      cell.s = {
        font: { sz: 11, color: { rgb: '374151' } },
        border: CELL_BORDER,
        alignment: { vertical: 'center', wrapText: true },
        ...(zebra ? { fill: { fgColor: { rgb: 'F8FAFC' } } } : {}),
      };
    }
  }
}

/** Titre de section (ex. "PRODUITS", "CLIENT") : gras, discret, sans bordure. */
export function styleSectionTitle(ws: any, rowIdx: number, col: number) {
  cellAt(ws, rowIdx, col).s = {
    font: { bold: true, sz: 11, color: { rgb: '8A9BB5' } },
  };
}

/** Ligne "Filtres appliqués" sous le bandeau titre : italique, discrète. */
export function styleFiltersLine(ws: any, rowIdx: number, col: number) {
  cellAt(ws, rowIdx, col).s = {
    font: { italic: true, sz: 10, color: { rgb: '8A9BB5' } },
  };
}

/** Ligne sous-total (Montant HT, TVA…) : encadrée finement, valeur en gras. */
export function styleSubTotalRow(ws: any, rowIdx: number, labelCol: number, valueCol: number) {
  cellAt(ws, rowIdx, labelCol).s = {
    font: { sz: 11, color: { rgb: '666666' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: CELL_BORDER,
  };
  cellAt(ws, rowIdx, valueCol).s = {
    font: { sz: 11, bold: true, color: { rgb: '374151' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: CELL_BORDER,
  };
}

/**
 * Total mis en évidence : fond vert PSI, texte blanc, bordure épaisse.
 * valueColEnd permet de mettre en évidence plusieurs colonnes de valeur d'affilée
 * (ex. Valeur + Prix) comme un seul bloc encadré.
 */
export function styleTotalHighlight(ws: any, rowIdx: number, labelCol: number, valueColStart: number, valueColEnd?: number) {
  const end = valueColEnd ?? valueColStart;
  const THICK = { style: 'medium', color: { rgb: '166534' } } as const;
  cellAt(ws, rowIdx, labelCol).s = {
    font: { bold: true, sz: 12, color: { rgb: '166534' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: { top: THICK, bottom: THICK, left: THICK, right: { style: 'none' } },
  };
  for (let c = valueColStart; c <= end; c++) {
    cellAt(ws, rowIdx, c).s = {
      font: { bold: true, sz: 14, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '4CAF4F' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: THICK, bottom: THICK,
        left: c === valueColStart ? { style: 'none' } : THICK,
        right: c === end ? THICK : { style: 'none' },
      },
    };
  }
}
