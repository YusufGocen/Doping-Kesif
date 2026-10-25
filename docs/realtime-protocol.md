# Canlı bildirim ve yeniden bağlanma sözleşmesi

22 Ekim 2026. Sunucu endpoint'i `/api/v1/kesif/ws`; yerelde `ws://127.0.0.1:8080/api/v1/kesif/ws`, HTTPS ortamında `wss://...` kullanılır. Bu aşama backend içindir; frontend ekranları henüz oluşturulmadı.

## Bağlantı ve kimlik

1. İzin verilen Origin ile WebSocket bağlantısı açılır. Liste mevcut `kesif.web.allowed-origins` ayarıdır; local varsayılanları localhost:5173 ve 127.0.0.1:5173'tür. Origin yoksa veya listede değilse upgrade 403 olur.
2. İlk 5 saniye içinde tek AUTH metin mesajı gönderilir:

```json
{"type":"AUTH","token":"<accessToken>"}
```

URL query parametreleri bütünüyle reddedilir; token URL'ye konulmaz. Cookie veya HTTP handshake tek başına oyuncu kimliği sağlamaz. Token mevcut JwtDecoder ile imza/issuer/audience/süre/sub açısından doğrulanır; STUDENT rolü ve dolmamış exp zorunludur. Decoder'ın saat toleransı olsa da süresi dolmuş token WebSocket açamaz.

3. Sunucu cevap verir:

```json
{"type":"READY","protocolVersion":1,"resyncRequired":true,"expiresAt":"<ISO instant>"}
```

4. READY sonrasında yalnız `{"type":"PING"}` kabul edilir; karşılığı `{"type":"PONG"}` olur. Client SUBSCRIBE, başka playerId, oyun komutu veya ikinci AUTH gönderemez. Cevap/hazır/başlat/devam komutları JWT korumalı REST endpoint'lerinde kalır.

Geçersiz kimlik/protokol ve süresi dolan bağlantı 1008 ile kapanır. Token yenilenince yeni bağlantı kurulur. Worker saniyede kimlik bekleme ve token sürelerini kontrol eder; yayın sırasında da exp kontrol edilir. Ağ hatası 1011; toplam kapasite doluluğu 1013 olabilir. Token ve gelen mesaj içerikleri loglanmaz.

Her oyuncuya en fazla 4, uygulama instance'ına en fazla 200 bağlantı; metin limiti 8 KiB, gönderim buffer'ı 64 KiB, concurrent-send süre eşiği 5 saniyedir. Yavaş veya bozulan bağlantı kapatılıp REST eşitlemesine bırakılır. Bunlar teknik MVP limitleridir, yük testi sonucu değildir.

## Sunucunun belirlediği alıcılar

Oyuncu kendi kullanıcı akışına bağlanır; oda/oyun veya başka kullanıcı kanalı seçemez. Alıcılar DB'den belirlenir:

- ROOM: oda katılımcıları ve o odaya davet edilmiş öğrenci. Böylece henüz katılmamış öğrenci davet/iptal/expiry bildirimi alır.
- SESSION: yalnız o oturumun iki kayıtlı katılımcısı.

Katılımcı olmayan üçüncü öğrenci ilgili olayı alamaz. Kapalı odanın geçmiş katılımcısı kapanma bildirimini alabilir; bu, başka bir odaya erişim vermez. Detayları okumak ayrıca REST yetki kontrolüne tabidir.

## Olay biçimi

```json
{
  "type":"EVENT",
  "eventId":"<UUID>",
  "aggregateType":"SESSION",
  "aggregateId":"<session UUID>",
  "eventType":"ROUND_REVEALED",
  "sequence":12,
  "occurredAt":"<ISO instant>"
}
```

Bu bir **durum değişikliği bildirimidir**. DB outbox payload'ı yayınlanmaz. Soru içeriği, doğru cevap, seçenek, ham oda kodu ve token taşınmaz. İstemci ilgili yetkili REST snapshot'ını okur; QUESTION_OPEN aşamasındaki cevap gizliliği korunur.

ROOM ve SESSION sıraları birbirinden bağımsızdır. İstemci sıra numarasını `(aggregateType,aggregateId)` anahtarıyla takip eder; tüm olaylar için tek global sayaç kullanmaz. Tekrarlı eventId veya uygulanmış sequence güvenle göz ardı edilir. Sıra boşluğu veya bilinmeyen olay durumunda snapshot yeniden okunur.

## Yeniden bağlanma algoritması

Her bağlantıda READY/resyncRequired alınır; önceden yayınlanmış olayların tekrar oynatılması vaat edilmez.

1. Geçerli token al, bağlantıyı aç ve AUTH gönder. Token'ı kalıcı loglara/URL'ye yazma.
2. READY sonrası `GET /rooms/active`, `GET /sessions/active`, `GET /invitations/incoming` çağır. 204 aktif kayıt olmadığını belirtir. `/progress`, `/collections`, `/history` verilerini de yenile; oyun çevrimdışıyken tamamlanmış olabilir. Önceden bilinen sessionId varsa `/sessions/{id}` ve tamamlandıysa `/sessions/{id}/result` ile son durumunu doğrula.
3. Bu istekler sürerken gelen olayları buffer'a al. RoomView.sequence ve SessionView.sequence değerleriyle yerel durumu başlat.
4. Buffer'da snapshot'tan daha yeni olay varsa ilgili snapshot'ı tekrar al. Okuma sırasında da yeni olay gelebilir; son gördüğün sequence karşılanana kadar birleştir. `INVITATION_RECEIVED` ve davet/oda durum değişikliklerinde incoming listesini de yenile.
5. ROOM GAME_STARTED bildiriminde sessions/active çağrısıyla oturum kimliğini öğren. SESSION GAME_COMPLETED veya REWARDS_FINALIZED bildiriminde session snapshot'ı ve `/sessions/{id}/result`, `/collections`, `/progress`, `/history` verilerini yenile.
6. Bağlantı koparsa durum tahmin ederek ilerletme. Artan gecikmeyle tekrar bağlan, token gerekiyorsa yenile ve aynı eşitlemeyi yap. Herhangi bir şüphede REST sunucu otoritesidir.

İstemci, aynı anda gelen birçok bildirimi bir snapshot isteğinde birleştirebilir; her bildirim için ayrı ağ isteği zorunlu değildir. Frontend'in otomatik yeniden deneme/ekran gösterimi bir sonraki frontend aşamasında uygulanacaktır. Backend yeniden bağlanmaya ve güncel durum okumaya hazırdır. Oyunun deadline'ları bağlantı kopunca sıfırlanmaz; terk/pause/ceza kuralı eklenmedi.

## Outbox yayını ve teslim sınırı

Oyun/lobi/ödül işlemleri outbox satırını kendi DB transaction'ında yazar. Worker yalnız commit edilmiş görünür satırları okur; saniyede en fazla 50 olay işler. `FOR UPDATE SKIP LOCKED` ile bir satırın eşzamanlı claim edilmesi önlenir. Aynı aggregate'te önceki yayınlanmamış sequence varken sonraki olay bekler.

Başarılı server dispatch sonrası published_at yazılır. Dispatch hatasında attempts artar; 2/4/8/16/32/60 saniyelik artan gecikmeyle tekrar denenir. Dispatch hatası veren veya desteklenmeyen aggregate türündeki olay atlanmaz; kendi aggregate sırasını bekletir, diğer aggregate'ler işlenebilir. Yayın ile DB işaretlemesi arasında process çökmesi tekrar bildirim üretebilir; istemci dedupe yapar.

published_at, her tarayıcının olayı gördüğüne dair ACK değildir. Çevrimdışı oyuncu varsa olay yine işlenmiş sayılır; onun toparlanma yolu REST snapshot'ıdır. Tek bağlantıdaki I/O hatası diğer oyunculara bildirimi engellemez. Bu nedenle uçtan uca exactly-once veya kalıcı kişisel mesaj kuyruğu iddiası yoktur.

Mevcut dağıtım **tek backend instance** içindir. Bellekteki WebSocket bağlantıları başka instance'larda görülmez. Birden fazla instance'a ölçeklemeden önce ortak broker/pub-sub ve dağıtık bağlantı/limit tasarımı eklenmelidir. DB claim kilidi tek başına bu fanout sorununu çözmez. Redis/RabbitMQ bağlantısı bu aşamada kurulmadı.

Yeni tablo/migration gerekmedi; Flyway V9 ve 18 domain tablosu korunur. REST OpenAPI WebSocket frame'lerini tarif etmez; bu belge protocolVersion=1 sözleşmesidir.


## Frontend uygulaması — 23 Ekim 2026

Native WebSocket istemcisi shared/realtime/client.ts, app cache/oturum bileşimi RealtimeProvider.tsx içindedir. READY'de aktif oda/oyun/davet ve kalıcı kazanımlar yenilenir; resync boyunca olaylar birleştirilir. Canlı bağlantıda 30 saniyelik güvenlik polling'i, kopuklukta 1–3 saniyelik fallback korunur. VITE_ENABLE_REALTIME=false polling modunu açar. Unit/gerçek ağ testleri geçti; gerçek tarayıcı E2E durumunu frontend-browser-e2e-status.md açıkça ayrı raporlar.
