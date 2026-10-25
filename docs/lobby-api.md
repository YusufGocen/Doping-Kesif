# Davet, kodlu oda ve ortak lobi

Base path `/api/v1/kesif`. Bütün işlemler STUDENT JWT ister. Kimlik JWT sub'dan alınır; istemci owner/player kimliği seçemez. Aynı Butik grubu koşulu korunur. Gerçek Butik entegrasyonu henüz yoktur; local fixture çalışır.

## Ortak lobi modeli

Davet veya kod, aynı kesif_room/kesif_room_player yapısına bağlanır. Oda sahibi slot 1, tek misafir slot 2'dir. Bir öğrenci aynı anda yalnız bir aktif lobide bulunabilir. Başkalarının odaları ID değiştirilerek okunamaz. Oda iptal edilince veya süresi dolunca rezervasyonlar bırakılır; tarihçe satırları silinmez.

Durum: OPEN → FULL; başlamadan CANCELLED veya EXPIRED. FULL yalnız iki kişinin katıldığını belirtir. Her katılımcının hazır durumu ayrıdır. İki aktif öğrenci hazırsa readyToStart=true olur; **hazır olmak GameSession oluşturmaz ve oyunu başlatmaz**. Sahip ayrıca POST /rooms/{id}/start çağırır; [oyun motoru sözleşmesi](game-api.md) uygulanmıştır. Başladıktan sonra STARTED, oyun bitince CLOSED olur.

## Oluşturma örneği

Önce katalog/puzzle endpoint'lerinden gerçek ID'leri alın. Tüm Konular için topicId=null kullanın.

```json
{
  "clientRequestId":"<istemcinin ürettiği UUID>",
  "selection":{
    "groupId":"local-group-8a",
    "puzzleId":"<puzzle UUID>",
    "subjectId":"<ders UUID>",
    "gradeLevel":8,
    "topicId":"<konu UUID veya null>"
  }
}
```

Kodlu oda için POST /rooms kullanılır. Davet için aynı gövdeye `inviteeExternalUserId:"local:ayse"` ekleyip POST /invitations kullanın. Davette öğrenci aynı grubun arkadaşları arasında olmalıdır. Soru havuzunda 10 yayınlanmış uygun soru, aktif puzzle/ders ve konu-sınıf-ders uyumu doğrulanır.

clientRequestId her yeni kullanıcı eyleminde yeni UUID olmalıdır. Ağ tekrarında aynı UUID ve aynı içerik gönderilir: aynı oda/davet döner, ikinci kayıt oluşmaz. Aynı anahtarın farklı seçim veya davetliyle kullanımı 409 IDEMPOTENCY_CONFLICT verir. Yanıt güncel lobi durumunu gösterebilir; tarihsel oluşturma yanıtının birebir kopyası değildir.

## Endpoint'ler

| Metot | Yol | Sonuç |
|---|---|---|
| POST | /rooms | 201 RoomView; yalnız sahibine joinCode |
| POST | /rooms/join | `{code}` ile katılım, 200 RoomView |
| GET | /rooms/active | Kendi lobini bul; yoksa 204 |
| GET | /rooms/{id} | Yalnız katılımcıya güncel snapshot |
| POST | /rooms/{id}/ready | `{ready:true/false}`; kendi hazır durumu |
| POST | /rooms/{id}/leave | Katılımcı ayrılır ve lobi kapanır |
| POST | /rooms/{id}/cancel | Yalnız oda sahibi iptal eder |
| POST | /invitations | 201 InvitationView |
| GET | /invitations/incoming?page=0&size=20 | Yalnız kendi geçerli bekleyen davetlerin; page 0–10000, size 1–100 |
| POST | /invitations/{id}/accept | Yalnız davetli; 200 ortak RoomView |
| POST | /invitations/{id}/reject | Yalnız davetli; 200 InvitationView |
| POST | /invitations/{id}/cancel | Yalnız gönderen; 200 InvitationView |

RoomView: id, ownerPlayerId, joinMethod, status, selection, expiresAt, players, readyToStart, sequence, joinCode. Her oyuncuda playerId, displayName, slot, ready, active bulunur. Kod yalnız sahibinin açık odasında görünür; misafire ve kapalı odalarda null döner. Digest, creation_request_id ve iç policy snapshot'ı API'den dönmez.

InvitationView: id, roomId, inviterId, inviteeId, status, expiresAt, selection. Davet kabulü/reddi/iptali aynı eylem tekrarında yeni yan etki üretmez. Kabulden sonra davet iptali ayrı bir kabul geri alma değildir; oda iptal/ayrılma işlemi kullanılmalıdır.

## Kod güvenliği ve yeniden başlatma

- Kod 8 karakter, 32 sembollük belirsiz harfleri ayıklanmış alfabe ile üretilir (40 bit). Öğrenci başına katılım denemesi sınırlanır.
- Kod denemeleri ile oda/davet oluşturma için öğrenci başına ayrı 60 saniyelik pencereler vardır. Her pencere varsayılan 10 istek kabul eder; teknik limit kesif.rooms.join-attempts-per-minute ile ayarlanabilir. Retry'lar da limite dahildir. Sayaç bellekte ve en fazla 10000 pencereyle sınırlıdır; çoklu instance için ortak rate-limit altyapısı ayrıca gerekir.
- Sunucu anahtarlı HMAC ile aynı oluşturma isteğinde aynı kodu türetir. Veritabanında sadece HMAC doğrulama değeri saklanır; düz kod URL, log veya outbox'a konulmaz.
- ROOM_CODE_SECRET üretimde zorunlu, Base64 biçiminde en az 32 rastgele byte olmalıdır; secrets yönetiminde tutulmalı ve instance'lar arasında aynı olmalıdır.
- Local secret verilmezse anahtar bellekte oluşturulur. Yeniden başlatmada çözülemeyen açık kodlu odalar EXPIRED yapılıp rezervasyonları bırakılır. Sabit secret kullanılırsa açık kodlar yeniden başlatmada korunabilir; süresi dolanlar yine kapanır.
- Kod çakışması çok düşük olasılıklı olsa da aktif digest UNIQUE ile korunur; çakışma 409 döner, yeni clientRequestId ile tekrar oluşturulabilir.

## Süreler ve açık ürün kararları

Local demo örnekleri: KESIF_ROOM_TTL=PT5M, KESIF_INVITATION_TTL=PT2M. **Bunlar onaylı ürün kararları değildir**; değiştirilebilir teknik demo değerleridir. Local dışı süreler açık konfigürasyon gerektirir. Kabul edilen davetin lobisi ilk oluşturulma deadline'ını korur; bu davranış da ürün incelemesine açıktır.

Worker varsayılan 30 saniyede, her geçişte en fazla 100 süresi dolmuş lobiyi işler. Yetkili GET /rooms/{id} veya /rooms/active de süre aşımını işler. Katılma/hazır/kabul deadline'ı anında denetler ve süresi geçmiş işlemi kabul etmez. Ret cevabıyla rollback olan expiry güncellemesi worker/GET tarafından tamamlanır. Yeni oda isteği henüz serbest bırakılmamış rezervasyonda PLAYER_BUSY alabilir; frontend önce /rooms/active ile durumu eşitlemelidir.

İki kişilik MVP'de herhangi bir katılımcının ayrılması lobiyi CANCELLED yapar; misafir değiştirip aynı odayı yeniden açma ve sahibi devretme yoktur. Bu sade davranış ürün incelemesine açıktır. Başlamış maç için lobi leave/cancel uygulanmaz; oyun içi terk ayrı tasarlanacaktır.

## Olaylar ve transaction

Oda/davet/hazır değişiklikleri aynı transaction'da outbox'a ve artan room event_sequence ile yazılır. Aynı eylem tekrarı olay sayısını artırmaz. Yayıncı/WebSocket henüz yoktur; frontend bu aşamada REST snapshot ve incoming sorgularını kullanır. Olayların DB'de bulunması karşı tarafa iletildiği anlamına gelmez.

Profil rezervasyonu için önce oyuncu satırı FOR NO KEY UPDATE, ardından tek oda satırı FOR UPDATE ile kilitlenir. Profil kilidi, karşılıklı davetlerin foreign-key KEY SHARE kilitlerini engellemez. Başka bir odaya katılım sırasında ikinci aktif oda kilidi alınmaz; çapraz katılım ve karşılıklı davette deadlock oluşmaması test edilir. Oda kilitlendikten sonra JPA cache'i yenilenir. Aktif oda aramasında kilitten önce yalnız UUID alınır, üyelik bayrakları önceden cache'lenmez. Davet değişimleri de aynı oda kilidini kullanır. Gelecekte gerçek grup HTTP çağrıları uzun DB kilitlerinin dışında doğrulanmış adapter bağlamına taşınmalıdır; şu an dış adapter 503 ile kapalıdır.

Katılım/kabul sırasında oda sahibinin ve katılan öğrencinin; hazır olma sırasında iki mevcut katılımcının güncel grup üyeliği yeniden denetlenir.

## Hatalar

401 UNAUTHENTICATED; 403 NOT_SAME_GROUP / NOT_ROOM_OWNER; 404 ROOM_NOT_FOUND / ROOM_NOT_AVAILABLE / INVITATION_NOT_FOUND; 409 ROOM_FULL / PLAYER_BUSY / IDEMPOTENCY_CONFLICT / INVITATION_NOT_PENDING / CONCURRENT_UPDATE / STATE_CONFLICT; 410 LOBBY_EXPIRED; 422 INSUFFICIENT_QUESTIONS / SELECTION_MISMATCH / CANNOT_INVITE_SELF; 429 ROOM_JOIN_RATE_LIMITED / LOBBY_CREATION_RATE_LIMITED.

Kodla aramada temizlikten sonra artık aktif olmayan oda 404 dönebilir. Bilinen davet/oda için deadline kontrolü 410 verir. Hatalar SQL veya kod/token değerlerini açığa çıkarmaz.
