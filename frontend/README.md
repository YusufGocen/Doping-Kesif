# Doping Keşif frontend

Node 24 LTS ile frontend klasöründe `npm.cmd run dev`. Önizleme: http://localhost:5173/giris . Backend ayrıca 8080 portunda local profilde çalışır. Bağımlılıklar yoksa önce `npm.cmd ci` çalıştırılır.

## Mevcut akış

- Giriş: backend'den alınan dört yerel kullanıcı. Token yalnız bellektedir; yenilemede yeniden giriş gerekir. Üretim SSO henüz bağlı değildir; yerel giriş production build'de kapalıdır.
- Keşif → puzzle → sınıf/ders/konu → oyun yöntemi seçimi.
- Arkadaş seçip davet gönderme/kabul/ret veya kodlu oda oluşturup kod/link ile katılma.
- Ortak lobi: avatarlar, oyun bilgileri, hazır durumları; oda sahibi başlatır.
- 10 ortak soru, süre ve cevap bekleme, puzzle açılması, sonuç/XP, koleksiyon ve geçmiş.
- Ana sayfadan Oda Koduyla Katıl ve Koleksiyonum bağlantıları.

`/kesif/eslesme`: Arkadaş Seç / Kod-Link yöntemi. `/kesif/oda?tab=olustur`: seçilen görevle oluşturma. `/kesif/oda?kod=...`: kodla/linkle katılım. `/kesif/oda/:id/paylas`: sahibine kod/kopyalama ve katılım kontrolü. Kod sunucuda üretilir; 8 karakterlidir. Oda adı/süresi için kullanıcı alanı yoktur; geçerlilik sunucudan gelir. Linkler mevcut origin ile üretilir; yerel bilgisayar linki tek başına başka bilgisayara erişim sağlamaz.

## Kontroller

```powershell
npm.cmd run check
npm.cmd run smoke:catalog
node scripts/smoke-progress.mjs
node scripts/smoke-code-room.mjs
```

`check`: Prettier → Vitest → TypeScript/Vite build. HTTP smoke için Vite ve backend açık olmalıdır. `smoke-progress` salt okunurdur. `smoke-code-room` Mert/Zeynep ile gerçek kodlu oda → katıl → hazır → başlat → 10 soru → tamamlanma kontrolüdür; yerel geçmiş/XP kaydı oluşturabilir. Hesapların aktif odası varsa mevcut duruma dokunmadan atlar. Kod/token yazdırmaz. Oyun tamamlanamazsa temizlik hatasını oda kimliğiyle bildirir.

## Mimari ve sınırlar

app, layouts/dashboard, features/{auth,discovery,catalog,social,game,progress}, shared, styles ayrımı vardır. Feature'lar birbirini doğrudan import etmez. App katmanı bileşimi yapar. Şema doğrulaması, oturum koruması ve hesap değişiminde cache temizliği vardır. Ayrıntılar: ../docs/frontend-architecture.md ve ../docs/frontend-plan.md.

Sol sidebar/üst alan/sağ takvim korunur; akış orta alanda çalışır. WebSocket/reconnect bağlıdır; canlıyken 30 saniyelik güvenlik eşitlemesi, kopuklukta 1–3 saniyelik polling korunur. Gerçek tarayıcı iki oturum E2E ve mobil/görsel kabul kontrolleri kalır. Diğer Doping platform servisleri ve rozet sistemi bu yerel projeye entegre değildir. Dağıtım yapılmadı.

Canlı bağlantı kontrolü: frontend klasöründe node scripts/smoke-realtime.mjs. İki gerçek ağ istemcisiyle ret/iptal, kodlu oda, 10 tur, bir sunucu timeout'u ve kasıtlı kopma/reconnect testidir; geçmiş/XP oluşturabilir. Gerçek tarayıcı değildir. Tarayıcı kontrol listesi: ../docs/frontend-browser-e2e-status.md. VITE_ENABLE_REALTIME=false yalnız polling kullanır.
