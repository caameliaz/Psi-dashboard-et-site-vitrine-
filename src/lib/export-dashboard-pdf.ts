// PDF du tableau de bord (bouton « PDF » du dashboard) : page A4 imprimable, graphiques
// en SVG (nets, texte sélectionnable), puis fenêtre d'impression → « Enregistrer en PDF ».
// Même technique que les autres PDF de l'app (fiche client, commande) : aucune librairie.
// Les chiffres viennent des mêmes API que le dashboard, pour le mois choisi.

const MOIS_NOMS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const VERT = '#4CAF4F';

interface StatsMois {
  stats: { commandes: number; devisMois: number; ventesMois: number; livrees: number; devis: number; evolutionVentes: number; evolutionDevis: number };
  evolutionCommandes: number;
  devisEnAttente?: { count: number; montant: number };
  topProduits: { ref: string; qty: number; label: string }[];
  topWilayas: { wilaya: string; count: number }[];
  serie6Mois: { mois: string; commandes: number; devis: number }[];
  serie6MoisVentes: { mois: string; ventes: number; commandes?: number; devis?: number }[];
  sourceStats: { site: number; manuel: number };
  ventesTotal?: { global: number } | null;
}

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const da = (n: number) => `${Math.round(n || 0).toLocaleString('fr-FR')} DA`;
const court = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace('.', ',')}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n)));
const evol = (p: number) => `<span style="color:${p >= 0 ? '#16A34A' : '#DC2626'};font-weight:700">${p >= 0 ? '▲' : '▼'} ${Math.abs(p)} %</span>`;

// Axe Y à graduations rondes (0, 10, 20… / 0, 200k, 400k…) : au plus 5 intervalles
function axe(max: number) {
  if (max <= 0) return { top: 1, pas: 1 };
  const brut = max / 5;
  const p = Math.pow(10, Math.floor(Math.log10(brut)));
  const n = brut / p;
  const pas = Math.max(1, (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p);
  return { top: Math.ceil(max / pas) * pas, pas };
}

// Barres (montant vendu par mois), valeur écrite au-dessus de chaque barre
function barChart(labels: string[], series: { nom: string; couleur: string; valeurs: number[] }[], formatValeur: (v: number) => string = (v) => String(v)) {
  const W = 700, H = 230, L = 44, R = 10, T = 18, B = 28;
  const { top: max, pas } = axe(Math.max(0, ...series.flatMap((s) => s.valeurs)));
  const groupe = (W - L - R) / Math.max(1, labels.length);
  const bw = Math.min(series.length === 1 ? 60 : 26, (groupe * 0.7) / series.length);
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  let svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="Helvetica,Arial,sans-serif">`;
  for (let v = 0; v <= max; v += pas) {
    svg += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#EEF2F6"/>`;
    svg += `<text x="${L - 6}" y="${y(v) + 3}" font-size="10" fill="#8A9BB5" text-anchor="end">${court(v)}</text>`;
  }
  labels.forEach((l, i) => {
    const cx = L + groupe * i + groupe / 2;
    svg += `<text x="${cx}" y="${H - 8}" font-size="10" fill="#8A9BB5" text-anchor="middle">${esc(l)}</text>`;
    series.forEach((s, j) => {
      const v = s.valeurs[i] ?? 0;
      const bx = cx - (bw * series.length) / 2 + j * bw;
      svg += `<rect x="${bx + 1}" y="${y(v)}" width="${bw - 2}" height="${Math.max(0, H - B - y(v))}" rx="2" fill="${s.couleur}"/>`;
      if (v > 0) svg += `<text x="${bx + bw / 2}" y="${y(v) - 4}" font-size="10" font-weight="700" fill="#0F172A" text-anchor="middle">${esc(formatValeur(v))}</text>`;
    });
  });
  return svg + '</svg>';
}

/** À appeler DIRECTEMENT dans le clic (la fenêtre est ouverte tout de suite, sinon bloquée comme pop-up). */
export async function printDashboardPdf(opts: { mois: number; annee: number; isAdmin: boolean }) {
  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) { alert('Autorisez les fenêtres pop-up pour psi.dz afin de générer le PDF.'); return; }
  w.document.write('<p style="font-family:Arial;padding:40px;color:#555">Génération du rapport…</p>');

  const mm = String(opts.mois + 1).padStart(2, '0');
  const dernierJour = new Date(opts.annee, opts.mois + 1, 0).getDate();
  const qs = `?startDate=${opts.annee}-${mm}-01&endDate=${opts.annee}-${mm}-${String(dernierJour).padStart(2, '0')}`;
  const periode = `${MOIS_NOMS[opts.mois]} ${opts.annee}`;

  let d: StatsMois;
  let visites: number | null = null;
  try {
    const [statsRes, gaRes] = await Promise.all([
      fetch(`/api/stats${qs}`, { credentials: 'include' }),
      fetch(`/api/analytics${qs}`, { credentials: 'include' }).catch(() => null),
    ]);
    if (!statsRes.ok) throw new Error(`stats ${statsRes.status}`);
    d = await statsRes.json();
    if (gaRes?.ok) visites = (await gaRes.json())?.monthly?.total ?? null;
  } catch (e) {
    console.error('[pdf dashboard]', e);
    w.document.body.innerHTML = '<p style="font-family:Arial;padding:40px;color:#DC2626">Impossible de charger les chiffres. Fermez cette fenêtre et réessayez.</p>';
    return;
  }

  let logoHtml = '<div style="font-size:20px;font-weight:800">PSI</div><div style="font-size:10px;color:#666">Paper Solutions Industry</div>';
  try {
    const blob = await (await fetch('/Logo PSI-avectexte.jpeg')).blob();
    const b64 = await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(blob); });
    logoHtml = `<img src="${b64}" alt="PSI" style="height:46px;display:block"/>`;
  } catch { /* logo texte */ }

  const s = d.stats;
  const tuiles: [string, string, string][] = [
    ['Ventes du mois', da(s.ventesMois), `${evol(s.evolutionVentes)} vs période précédente`],
    ['Commandes du mois', String(s.commandes), `${evol(d.evolutionCommandes)} vs période précédente`],
    ['Devis du mois', String(s.devisMois), `${evol(s.evolutionDevis)} vs période précédente`],
    ['Ventes livrées', String(s.livrees), 'commandes + devis livrés'],
    ['Devis en cours', String(s.devis), d.devisEnAttente ? `dont en attente : ${da(d.devisEnAttente.montant)}` : 'en attente + contactés'],
    ['Visites du site', visites != null ? visites.toLocaleString('fr-FR') : '—', 'site public (Google Analytics)'],
  ];
  if (opts.isAdmin && d.ventesTotal) tuiles.push(["Chiffre d'affaires total", da(d.ventesTotal.global), 'depuis la première vente']);

  const ventes6 = d.serie6MoisVentes ?? [];
  const seriesVentes = [{ nom: 'Ventes', couleur: VERT, valeurs: ventes6.map((m) => m.ventes) }];
  const maxQte = Math.max(1, ...d.topProduits.map((p) => p.qty));
  const topProduitsHtml = d.topProduits.length
    ? d.topProduits.map((p) => `<div class="hbar"><span class="hlabel">${esc(p.label && p.label !== p.ref ? `${p.ref} · ${p.label}` : p.ref)}</span><span class="htrack"><span class="hfill" style="width:${(p.qty / maxQte) * 100}%"></span></span><span class="hval">${p.qty}</span></div>`).join('')
    : '<p class="vide">Aucune commande sur la période.</p>';
  const wilayasHtml = d.topWilayas.length
    ? `<table><thead><tr><th>Wilaya</th><th style="text-align:right">Commandes</th></tr></thead><tbody>${d.topWilayas.map((x) => `<tr><td>${esc(x.wilaya)}</td><td style="text-align:right">${x.count}</td></tr>`).join('')}</tbody></table>`
    : '<p class="vide">Aucune commande sur la période.</p>';
  const totalSource = d.sourceStats.site + d.sourceStats.manuel;
  const pctSite = totalSource > 0 ? Math.round((d.sourceStats.site / totalSource) * 100) : 0;

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/><title>Tableau de bord PSI — ${esc(periode)}</title>
<style>
  @page{size:A4;margin:12mm}
  *{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;color:#0F172A;background:#fff;padding:8px}
  .head{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #0F172A;padding-bottom:10px;margin-bottom:14px}
  .titre{text-align:right}.titre h1{font-size:20px;letter-spacing:-0.5px}.titre p{color:#64748B;margin-top:2px}
  .tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px}
  .tile{border:1px solid #E2E8F0;border-radius:8px;padding:9px 10px}
  .tile .l{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#8A9BB5}
  .tile .v{font-size:17px;font-weight:800;margin:4px 0 2px;color:#0F172A}
  .tile .s{font-size:9.5px;color:#64748B}
  .card{border:1px solid #E2E8F0;border-radius:8px;padding:10px 12px;margin-bottom:12px;break-inside:avoid}
  .card h2{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#8A9BB5;margin-bottom:6px}
  .grid2{display:grid;grid-template-columns:1.3fr 1fr;gap:12px}
  .hbar{display:flex;align-items:center;gap:8px;margin:5px 0}
  .hlabel{width:50%;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .htrack{flex:1;height:8px;background:#F2F4F7;border-radius:4px;overflow:hidden}
  .hfill{display:block;height:100%;background:${VERT};border-radius:4px}
  .hval{width:48px;text-align:right;color:#374151;font-weight:700}
  table{width:100%;border-collapse:collapse}th{text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.6px;color:#8A9BB5;border-bottom:1px solid #E2E8F0;padding:4px 0}
  td{padding:4px 0;border-bottom:1px solid #F2F4F7}
  .vide{color:#8A9BB5;padding:8px 0}
  .foot{display:flex;justify-content:space-between;color:#8A9BB5;font-size:9px;border-top:1px solid #E2E8F0;padding-top:8px;margin-top:4px}
</style></head><body>
<div class="head">
  <div>${logoHtml}</div>
  <div class="titre"><h1>Tableau de bord</h1><p>${esc(periode)} · édité le ${new Date().toLocaleDateString('fr-FR')}</p></div>
</div>
<div class="tiles">${tuiles.map(([l, v, sub]) => `<div class="tile"><div class="l">${esc(l)}</div><div class="v">${esc(v)}</div><div class="s">${sub}</div></div>`).join('')}</div>
<div class="card"><h2>Montant total vendu par mois (DA, commandes + devis livrés)</h2>${ventes6.length ? barChart(ventes6.map((m) => m.mois), seriesVentes, (v) => Math.round(v).toLocaleString('fr-FR')) : '<p class="vide">Aucune donnée.</p>'}</div>
<div class="grid2">
  <div class="card"><h2>Top produits — ${esc(periode)} (quantités commandées)</h2>${topProduitsHtml}</div>
  <div class="card"><h2>Commandes par wilaya — ${esc(periode)}</h2>${wilayasHtml}
    <h2 style="margin-top:10px">Origine des demandes (depuis le début)</h2>
    <p>Site web : <b>${d.sourceStats.site}</b> (${pctSite} %) · Manuel : <b>${d.sourceStats.manuel}</b> (${totalSource > 0 ? 100 - pctSite : 0} %)</p>
  </div>
</div>
<div class="foot"><span>PSI — Paper Solutions Industry · Centre El Qods, Chéraga, Alger</span><span>Ventes = commandes et devis au statut « Livré » · montants facturés</span></div>
</body></html>`;

  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 600);
}
