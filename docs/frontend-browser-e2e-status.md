# Frontend canlı bağlantı ve iki kullanıcı test durumu

23 Ekim 2026. Bu rapor gerçek tarayıcı, DOM testleri ve ağ/servis testlerini ayrı değerlendirir.

## Gerçek tarayıcı E2E — bekliyor

CUA envanteri apps=[] ve browsers=[] döndürdü; `iab` sekmesi açma denemesi Browser is not available: iab sonucu verdi. Bu nedenle iki tarayıcı/ekran üzerinden kullanıcı arayüzü kabulü yapılmadı. HTTP/WebSocket testleri bunun yerine geçmiş sayılmaz.

Tarayıcı erişimi sağlandığında iki ayrı profil veya Chrome + Edge ile http://localhost:5173/giris açılır. Yusuf ve Ayşe ayrı giriş yapar. Token yalnız bellekte olduğundan sayfa yenilenirse yeniden giriş gerekir. Aynı origin kullanılır; local link başka bilgisayardan erişim sağlamaz.

| Kontrol | Beklenen | Durum |
|---|---|---|
| Arkadaş daveti | Karşı tarafta davet görünür, ret/iptal iki tarafa yansır | Tarayıcı bekliyor |
| Kodlu oda | Kod/link ile aynı lobiye katılım; misafire kod gösterilmez | Tarayıcı bekliyor |
| Hazır/başlat | İki hazır oyuncu; yalnız sahip başlatır | Tarayıcı bekliyor |
| Ortak sorular | Aynı tur/seçenekler; gönderilmiş cevap değişmez; sonuç erken görünmez | Tarayıcı bekliyor |
| Süre dolması | Eksik cevap TIMEOUT; sonraki tur atlanmaz | Tarayıcı bekliyor |
| Ağ kopması | Bağlantı göstergesi değişir; geri gelince REST snapshot ile güncellenir | Tarayıcı bekliyor |
| Sekmeye dönüş | Görünür olunca bağlantı/eşitleme yenilenir | Tarayıcı bekliyor |
| Sonuç/koleksiyon | XP backend sonucu; session ve kişisel parça sayıları ayrı | Tarayıcı bekliyor |
| Hesap değişimi | Eski socket/timer kapanır; başka hesabın verisi görünmez | Tarayıcı bekliyor |

## Otomatik doğrulamalar

- `npm.cmd run check`: biçim, Vitest, TypeScript, Vite build.
- `node scripts/smoke-realtime.mjs`: iki bağımsız yerel kullanıcı ve gerçek WebSocket/REST üzerinden kodlu oda, davet ret/iptal, 10 tur, otomatik reconnect/resync, süre dolması ve final ödül tutarlılığı. Node 24'ün WebSocket Origin seçeneği yalnız bu ağ testinde kullanılır; browser client native WebSocket kullanır.
- Ağ testi aktif odası olan demo hesaplarında mevcut odayı koruyarak atlar. Test geçmiş/XP üretebilir. Başarısızlık sonrası yalnız testin ürettiği oda için `node scripts/recover-smoke-game.mjs <roomUUID>` kullanılabilir; mevcut oda kimliği uyuşmazsa işlem yapmaz.
- `src/shared/realtime/client.test.ts`: AUTH/URL, READY/resync buffer, event/sequence dedupe, ayrı aggregate sırası, backoff, eski bağlantı mesajlarını yok sayma, timer/token temizliği, policy close, heartbeat, offline ve geride kalan snapshot kontrolü.

Canlı bağlantıda WebSocket bildirimleri asıl tetikleyicidir; 30 saniyelik güvenlik eşitlemesi korunur. Bağlantı yokken eski 1–3 saniyelik polling devam eder. Token AUTH frame'inde taşınır; URL, storage veya loga yazılmaz. Her READY'de aktif oda/oyun/davet ve ilerleme/koleksiyon/geçmiş yenilenir; ekranların bilinen snapshot'ları da tekrar okunur.