# Davet/oda/lobi — teslim ve doğrulama

21 Ekim 2026. Maven verify **BUILD SUCCESS**. Gerçek PostgreSQL 16.14 ile **61 test: 0 başarısız, 0 hata, 0 atlanan**. Çalıştırılabilir JAR ve gerçek uygulamadan üretilen OpenAPI snapshot'ı yenilendi.

## Tamamlananlar

- Davet oluşturma, gelen davetler, kabul/ret/iptal.
- Kodlu oda oluşturma/katılım, kendi aktif lobisini bulma ve snapshot.
- Sadece kendi hazır durumunu değiştirme; iki öğrenci hazır olduğunda readyToStart bayrağı.
- Sahip iptali, katılımcı ayrılması, süre aşımı ve rezervasyonların serbest bırakılması.
- Katılım/kabulde iki tarafın, hazır olmada bütün katılımcıların güncel grup üyeliği kontrolü.
- clientRequestId ile tekil oluşturma; tekrar kabul/katılım/hazır/iptalde ikinci yan etki olmaması.
- Düz kod saklamadan HMAC tabanlı kod doğrulama; kodun yalnız sahibine gösterilmesi.
- Öğrenci bazında oluşturma ve katılım rate limit'i; sınırlandırılmış sayfalama ve DTO validation.
- Oda değişikliklerinin aynı transaction'da sıralı outbox kaydı.
- V7 migration; V1–V6 değiştirilmedi. Toplam tablo sayısı 18 kaldı.

## Test kapsamı

Lobi integration 23 test örneği (eşzamanlı katılım ve çift kabul üçer kez); codec/rate limit 4; mevcut kimlik/katalog/persistence/güvenlik 34: toplam 61.

Eşzamanlı son yere katılımda bir öğrenci katıldı, diğeri ROOM_FULL aldı; aynı isteğin eşzamanlı oluşturulması tek oda üretti. Çift kabul tek üyelik/tek kabul olayı üretti. Karşılıklı oda katılımı ve karşılıklı davet deadlock olmadan tamamlandı.

Başka gruptan katılım, başkasının oda ID'si, davetli olmayan kabulü, üyeliği sonradan kaldırılmış sahibin odasına katılım, sahte ready playerId ve geçersiz sayfalama reddedildi. Düz kod DB/outbox'ta bulunmadı. Deadline ve anahtar değişimiyle expire edilen odaların rezervasyonları bırakıldı.

Oda kilidi cached JPA sürümünden bağımsız native SELECT FOR UPDATE ile alınır, sonra entity refresh edilir. Profil rezervasyonu FOR NO KEY UPDATE kullanır; foreign-key kontrolleriyle çapraz davet deadlock'u önlenir.

Geçici test PostgreSQL'i test sonunda kapatıldı. Sistem servisi kurulmadı; parola/kod/token kaynaklara eklenmedi. MockMvc otomatik istek çıktısı kapalıdır.

## Sınırlar

Henüz GameSession başlatılmaz, soru seçilmez veya cevap alınmaz. WebSocket/outbox publisher, XP ve koleksiyon hesaplama, frontend ve gerçek Doping servis adapter'ları tamamlanmadı. Lobi polling ile izlenebilir; outbox kaydı olayın yayınlandığı anlamına gelmez.

Local 5 dakika oda/2 dakika davet ve ayrılan katılımcıda lobiyi kapatma davranışı demo önerileridir; ürün onayı verilmiş gibi işaretlenmedi. Üretim süreleri ve kod secret'ı açık konfigürasyon ister. Bellekteki limiter tek instance MVP içindir.

Sıradaki iş: 10 soruluk oyun motoru, REST cevap ve reveal akışı. Güncel [lobi API sözleşmesi](lobby-api.md) ve [OpenAPI](openapi.json).
