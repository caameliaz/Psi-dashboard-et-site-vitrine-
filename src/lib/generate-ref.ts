import { prisma } from './prisma';

const WILAYA_CODES: Record<string, string> = {
  'Adrar': '01', 'Chlef': '02', 'Laghouat': '03', 'Oum El Bouaghi': '04',
  'Batna': '05', 'Béjaïa': '06', 'Biskra': '07', 'Béchar': '08',
  'Blida': '09', 'Bouira': '10', 'Tamanrasset': '11', 'Tébessa': '12',
  'Tlemcen': '13', 'Tiaret': '14', 'Tizi Ouzou': '15', 'Alger': '16',
  'Djelfa': '17', 'Jijel': '18', 'Sétif': '19', 'Saïda': '20',
  'Skikda': '21', 'Sidi Bel Abbès': '22', 'Annaba': '23', 'Guelma': '24',
  'Constantine': '25', 'Médéa': '26', 'Mostaganem': '27', 'M\'Sila': '28',
  'Mascara': '29', 'Ouargla': '30', 'Oran': '31', 'El Bayadh': '32',
  'Illizi': '33', 'Bordj Bou Arréridj': '34', 'Boumerdès': '35',
  'El Tarf': '36', 'Tindouf': '37', 'Tissemsilt': '38', 'El Oued': '39',
  'Khenchela': '40', 'Souk Ahras': '41', 'Tipaza': '42', 'Mila': '43',
  'Aïn Defla': '44', 'Naâma': '45', 'Aïn Témouchent': '46', 'Ghardaïa': '47',
  'Relizane': '48', 'Timimoun': '49', 'Bordj Badji Mokhtar': '50',
  'Ouled Djellal': '51', 'Béni Abbès': '52', 'In Salah': '53',
  'In Guezzam': '54', 'Touggourt': '55', 'Djanet': '56',
  'El M\'Ghair': '57', 'El Meniaa': '58',
};

function wilayaCode(wilaya: string | null | undefined): string {
  if (!wilaya) return '00';
  const normalized = wilaya.trim();
  return WILAYA_CODES[normalized] ?? normalized.slice(0, 2).padStart(2, '0');
}

export async function generateOrderRef(wilaya: string | null | undefined): Promise<string> {
  const wCode = wilayaCode(wilaya);
  
  // Retry jusqu'à 5 fois pour éviter les collisions
  for (let attempt = 0; attempt < 5; attempt++) {
    const count = await prisma.order.count();
    const num = String(count + 1 + attempt).padStart(4, '0');
    const ref = `CMD-${wCode}-${num}`;
    
    // Vérifier si la référence existe déjà
    const exists = await prisma.order.findUnique({ where: { ref } });
    if (!exists) return ref;
  }
  
  // Fallback : utiliser un timestamp si toutes les tentatives échouent
  const timestamp = Date.now().toString().slice(-4);
  return `CMD-${wCode}-${timestamp}`;
}

export async function generateQuoteRef(wilaya: string | null | undefined): Promise<string> {
  const wCode = wilayaCode(wilaya);
  
  // Retry jusqu'à 5 fois pour éviter les collisions
  for (let attempt = 0; attempt < 5; attempt++) {
    const count = await prisma.quote.count();
    const num = String(count + 1 + attempt).padStart(4, '0');
    const ref = `DEV-${wCode}-${num}`;
    
    // Vérifier si la référence existe déjà
    const exists = await prisma.quote.findUnique({ where: { ref } });
    if (!exists) return ref;
  }
  
  // Fallback : utiliser un timestamp si toutes les tentatives échouent
  const timestamp = Date.now().toString().slice(-4);
  return `DEV-${wCode}-${timestamp}`;
}
