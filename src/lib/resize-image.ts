// Redimensionne/compresse une image côté client avant de l'envoyer en base64 — les photos
// prises directement au téléphone font souvent plusieurs Mo (jusqu'à 10+ Mo), ce qui peut faire
// échouer l'upload (requête trop grosse) et gonfle inutilement la base de données. Ramenées à
// 1200px de côté max et en JPEG qualité ~0.82, elles tombent en général sous 200-300 Ko.
export function resizeImageToDataUrl(file: File, maxDim = 1200, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas 2D context unavailable')); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
}
