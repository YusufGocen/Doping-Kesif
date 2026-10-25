# Oyun motoru ve REST sözleşmesi

Bu adım iki kişilik, 10 soruluk oyunu REST üzerinden çalıştırır. Kalıcı koleksiyon, XP ve oyun geçmişi [ödül sözleşmesinde](progress-and-rewards-api.md), WebSocket/outbox yayını [canlı protokolde](realtime-protocol.md) uygulanmıştır. Frontend ve gerçek kurum entegrasyonları sonraki aşamalardır. Mevcut sorular Kesif veritabanından seçilir; yerel fixture gerçek Doping soru bankası bağlantısı değildir.

Tüm adreslerin başı `/api/v1/kesif`; STUDENT rolü taşıyan Bearer JWT gerekir. Oyuncu kimliği body'den alınmaz.

| Yöntem ve adres | Davranış |
|---|---|
| POST /rooms/{id}/start | Yalnız sahip; iki aktif ve hazır oyuncuyu ve güncel grup üyeliklerini doğrular. Oda başına tek oturum; tekrar aynı oturumu döndürür. |
| GET /sessions/active | Kendi aktif oturumunu bulur; yoksa 204. Davetli oyuncu buradan sessionId alabilir. |
| GET /sessions/{id} | Yalnız oturum katılımcıları için güncel durum. Tamamlanan oyun da kimliğiyle okunabilir. |
| POST /sessions/{id}/rounds/{roundId}/answers | `{ "clientRequestId": "UUID", "optionKey": "A" }` |
| POST /sessions/{id}/continue | `{ "roundNo": 1 }`; her oyuncu yalnız kendi devam onayını verir. |

Başarılı komutlar 200 ve SessionView döndürür. Başlatılmamış/uygunsuz durum 409, yetersiz soru veya geçersiz seçenek 422, süresi bitmiş lobi 410; erişilemeyen oturum/tur 404. Eksik/geçersiz JWT 401, rol yetersizliği 403. İstemci tarafından gönderilen bilinmeyen alanlar 400 olur.

## Başlatma ve soru gizliliği

- Sınıf, ders, aktif konu ve PUBLISHED filtresiyle 10 farklı soru seçilir. Konu verilmezse aynı sınıf/dersin tüm aktif konuları kullanılabilir. Puzzle ve dersin aktifliği tekrar kontrol edilir.
- Seçilen soruların body, seçenek key/body ve contentVersion bilgileri o anda kalıcı snapshot'a alınır. Her soruda en az iki seçenek ve tam bir doğru cevap bulunmalıdır. Sonradan soru bankası düzenlemesi devam eden oyunu değiştirmez.
- Doğru key ayrı sunucu kolonunda saklanır. QUESTION_OPEN sırasında API'de correctOptionKey null, answers boş listedir. Rakibin seçeneği ve doğruluğu iki cevap/süre dolumuyla REVEAL açılana kadar gönderilmez. Yalnız answered bayrağı görülebilir.
- Gelecek 9 sorunun içerikleri, key'leri ve puzzle açılma sırası istemciye gönderilmez. Entity doğrudan JSON'a çevrilmez.
- Her yeni oturumun ortak puzzle'ı sıfırdan başlar; 1–20 parça sırası bir kez karıştırılıp saklanır.

## Cevap, açılma ve devam

1. Her tur QUESTION_OPEN olarak sunucunun kalıcı deadlineAt değeriyle açılır.
2. Bir oyuncunun ilk geçerli cevabı kaydedilir. Aynı clientRequestId + tur + seçenek tekrarı güvenlidir. Aynı anahtarla farklı içerik IDEMPOTENCY_CONFLICT; soru hâlâ açıkken başka anahtarla ikinci cevap ANSWER_ALREADY_SUBMITTED verir. Anahtar oyuncu genelinde tekildir.
3. İki cevap gelince tur yalnız bir kez çözülür. Süre dolunca eksik cevaplar TIMEOUT / yanlış olarak kaydedilir. `now >= deadlineAt` durumunda yeni cevap kabul edilmez. Geç veya eski tur için gelen komut, mevcut snapshot'ı döndürür; cevabı değiştirmez. Gelecek PENDING tura cevap yazılmaz.
4. Her doğru cevap ayrı bir parça açar: 0, 1 veya 2. Puan sayacı ve parçalar yalnız çözüm sırasında artar. Aynı transaction'da ROUND_REVEALED olayı yazılır.
5. REVEAL ekranında doğru key, iki cevap/timeout ve açılmış parçalar görünür. İki oyuncu devam ederse veya revealDeadlineAt dolarsa bir sonraki soru açılır. Eski devam istekleri sonraki turu atlatamaz.
6. Onuncu turun REVEAL adımı tamamlanınca oturum COMPLETED, oda CLOSED olur. Oda ve oturum aktif oyuncu rezervasyonları serbest bırakılır. İki oyuncunun doğru sayısı ve 0–20 ortak parça sonucu okunabilir.

## Süreler, yeniden başlatma ve transaction

Local örnekleri: KESIF_QUESTION_DURATION=PT30S, KESIF_REVEAL_DURATION=PT10S. Bunlar onaylı ürün süreleri değildir. Yerel olmayan ortamda iki değer açıkça verilmelidir. Kabul edilen aralık 1 saniye–10 dakika; tam milisaniye hassasiyeti. Kurallar her oturumda snapshot'a alınır; ortam ayarı değişmesi başlamış oyunun süresini değiştirmez.

Zamanlar PostgreSQL timestamptz ile aynı mikrosaniye hassasiyetine indirilir. Süre sınırında API yanıtı ile DB'deki deadline arasında yuvarlama farkı oluşmaz.

Deadline worker saniyede en fazla 100 gecikmiş oturum kimliği seçer. Her oturumu ayrı transaction'da işler; snapshot/komut da süreyi kontrol eder. Yeniden başlatma sonrasında geçmiş deadline'lar sıfırlanmaz: en fazla 20 geçişle kalan soru/reveal aşamaları toparlanır. Uzun kesintide cevaplanmayan sorular timeout olup oyun tamamlanabilir. Bu MVP davranışı ürün değerlendirmesine açıktır; pause/terk/reconnect cezası uygulanmaz.

Oyun mutasyonlarının kilidi oda satırıdır; oturum oda kilidi altında yenilenir. Lobi başlangıcı/iptali/expiry ile oyun başlangıcı ve cevaplar aynı kilitte sıralanır. Yeni oturum, oyuncular, 10 tur, room status ve outbox atomiktir. Cevap/parça/puan/geçiş/final de atomiktir. DB tekillikleri ikinci korumadır. V8, REVEAL deadline taramasına indeks ekler; uygulanmış migration'lar değiştirilmez.

Outbox olayları ROOM için GAME_STARTED / ROOM_CLOSED; SESSION için QUESTION_OPENED, ANSWER_RECEIVED, ROUND_REVEALED, PLAYER_CONTINUING, GAME_COMPLETED. Payload cevap veya doğru key içermez. Olay sıraları aggregate başına monoton artar. Yayınlama henüz uygulanmadı; canlı push yerine yetkili REST snapshot'ı kullanılabilir. Yetkili bir snapshot okuması süre durumunu ilerletebilir.

## Swagger ile deneme

1. Local auth endpoint'inden Yusuf ve Ayşe için ayrı token alın.
2. Yusuf kodlu oda oluştursun; Ayşe katılsın. Alternatif olarak daveti kabul etsin.
3. İki token ile kendi ready=true komutunu verin; Yusuf `/rooms/{id}/start` çağırsın.
4. Ayşe `/sessions/active` ile oturumu bulsun. İki oyuncu aynı round.id için ayrı clientRequestId ile seçenek göndersin.
5. REVEAL sonrasında iki token ile aynı roundNo için continue çağırın; 10 tur tekrarlayın.

Ödül politikasıyla başlayan yeni oyunlar tamamlanırken koleksiyon ve XP atomik olarak yazılır. Ayrı result endpoint'i ödül durumunu gösterir. Önceki oyunlara otomatik demo ödülü uygulanmaz; GAME_COMPLETED tek başına ödül verildiği anlamına gelmez. Ayrıntı: [koleksiyon/XP/geçmiş](progress-and-rewards-api.md).
