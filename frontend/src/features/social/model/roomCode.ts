import { ApiError } from '@/shared/api/ApiError';
export function normalizeRoomCode(input: string) {
  const value = input.trim();
  if (/^https?:/i.test(value)) {
    try {
      const url = new URL(value);
      if (url.origin !== window.location.origin || url.pathname !== '/kesif/oda') return '';
      return (url.searchParams.get('kod') ?? '').trim().toUpperCase();
    } catch {
      return '';
    }
  }
  return value.toUpperCase();
}
export const validRoomCode = (code: string) => /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/.test(code);
export function roomError(error: unknown) {
  if (!(error instanceof ApiError)) return 'İşlem tamamlanamadı. Tekrar deneyebilirsin.';
  if (error.code === 'NOT_SAME_GROUP' || error.status === 403)
    return 'Bu odaya yalnız aynı Butik grubundaki arkadaşlar katılabilir.';
  if (error.status === 429) return 'Çok sık deneme yaptın. Biraz bekleyip tekrar dene.';
  if (error.status === 404 || error.status === 410)
    return 'Oda bulunamadı veya kodun süresi doldu.';
  if (error.status === 409)
    return 'Oda dolu, kapanmış veya zaten başka bir odadasın. Aktif odanı kontrol et.';
  return 'Bağlantı veya oda işlemi tamamlanamadı. Tekrar dene.';
}
