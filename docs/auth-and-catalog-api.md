# JWT, profil ve katalog API sözleşmesi

Base path: `/api/v1/kesif`. Yanıtlar JSON; hata gövdeleri ProblemDetail ve `code` alanı kullanır. CORS altyapısının reddettiği preflight istekleri bunun dışındadır. Entity'ler API'den döndürülmez.

## Kimlik doğrulama

- `Authorization: Bearer <accessToken>` kullanılır. Kimlik, doğrulanmış JWT `sub` claim'idir; query/body kullanıcı ID'si kimliği değiştirmez.
- RS256 imza, issuer, audience, exp, zaman sınırları ve boş olmayan/en fazla 128 karakterlik sub doğrulanır. Spring'in varsayılan saat toleransı uygulanır.
- Varsayılan `roles` claim'i string listesidir. STUDENT/ADMIN değerleri tanınır; bu adımın öğrenci API'leri STUDENT gerektirir. Claim adı JWT_ROLES_CLAIM ile ayarlanır. Gerçek kurum claim eşlemesi henüz doğrulanmadı.
- Cookie, form login ve Basic auth yok; session tutulmaz. Yalnız Authorization header tabanlı stateless kullanım nedeniyle CSRF kapalıdır. Cookie auth eklenirse yeniden tasarlanmalıdır.
- Local anahtar bellekte oluşturulur, dosyaya/loga yazılmaz; yeniden başlatma eski local token'ları geçersiz kılar. Token varsayılan 15 dakika; refresh endpoint'i yoktur.
- Local HTTP sunucusu varsayılan 127.0.0.1'e bağlıdır. Hazır hesaplar gerçek giriş sistemi değildir.
- Local dışında JWT_ISSUER, JWT_AUDIENCE, HTTPS JWT_JWKS_URI zorunludur. Eksik/güvensiz konfigürasyonda startup reddedilir. Gerçek Doping bağlantısı tamamlandı kabul edilmez.
- prod aktifse local token controller, signing key ve seed yüklenmez; local,prod ve prod,local kombinasyonları da test edildi.

## Endpoint'ler

| Metot | Yol | Yetki | İşlev |
|---|---|---|---|
| GET | /dev/auth/users | Yalnız local, anonim | Test hesabı anahtarları |
| POST | /dev/auth/token | Yalnız local, anonim | Hazır öğrenci için JWT |
| GET | /me | STUDENT | Kesif profili; ilk erişimde tekil profil oluşturur |
| GET | /catalog/grades | STUDENT | 5–8 sınıflar ve oynanabilirlik |
| GET | /catalog/subjects?grade=8 | STUDENT | Yayınlanmış içeriği bulunan aktif dersler |
| GET | /catalog/topics?grade=8&subjectId=UUID | STUDENT | Konular ve soru sayıları |
| GET | /puzzles | STUDENT | Aktif puzzle metadata'sı |
| GET | /groups | STUDENT | Öğrencinin uygun Butik grupları |
| GET | /groups/{groupId}/friends | STUDENT + üyelik | Kendisi dışındaki grup arkadaşları |

## Local token ve profil

Hazır anahtarlar: yusuf, ayse, mert, zeynep, emir. İlk dördü local-group-8a, emir local-group-8b içindedir.

```http
POST /api/v1/kesif/dev/auth/token
Content-Type: application/json

{"userKey":"yusuf"}
```

Yanıt: `{accessToken, tokenType:"Bearer", expiresIn:900, expiresAt:"<UTC ISO-8601>"}`; Cache-Control: no-store. İstemci rol, harici kullanıcı ID'si veya süre seçemez. Ek JSON alanları reddedilir. Bu endpoint parola kontrolü yapmaz ve üretimde yoktur.

```json
{
  "id":"<Kesif UUID>",
  "externalUserId":"local:yusuf",
  "displayName":"Yusuf Göçen",
  "roles":["STUDENT"]
}
```

Yukarıdaki /me yanıtı local demo içindir. Gerçek sağlayıcıdan ilk gelen kimlikte gösterim adı alınmadığından displayName null olabilir. Profil ON CONFLICT DO NOTHING ve tekil external_user_id ile oluşturulur; eşzamanlı ilk erişimler aynı profile döner. XP/koleksiyon henüz /me'ye eklenmedi.

## Katalog davranışı

- Sınıf DTO'su: `{gradeLevel, playable}`. Ders/konu DTO'su: `{id, code, name, availableQuestionCount, playable}`. Puzzle DTO'su: `{id, code, title, assetKey, pieceCount}`.
- grade zorunlu ve 5–8 arasındadır. subjectId geçerli UUID olmalıdır.
- Yalnız aktif ders/konu ve PUBLISHED sorular sayılır. En az 10 soruya ulaşan seçim playable=true olur. Sınıf uygunluğu en az bir derste 10 soru gerektirir; farklı derslerdeki yetersiz havuzlar toplanıp oynanabilir sayılmaz.
- İçeriği olmayan sınıf için ders listesi boştur. Bulunmayan/aktif olmayan subjectId 404 verir.
- Tüm Konular için sahte UUID üretilmez; oda modelindeki topicId=null seçeneği kullanılacaktır.
- Local demo yalnız 8. sınıf matematikte 12 soru içerir. 5–7 mevcut içerikle playable=false görünür.
- Doğru cevaplar, soru/seçenek gövdeleri ve gelecek sorular katalog yanıtında yoktur.
- Demo puzzle assetKey değerleri medya yer tutucularıdır; gerçek görsel URL'si/tile servisi hazır değildir. Görseller frontend/asset adımında bağlanacaktır.

## Butik adapter sınırı

Local fixture 5 öğrenci ve 2 gruptur. Arkadaş listesi kendisini ve diğer grubun öğrencilerini içermez. Başka grup ID'si 403 NOT_SAME_GROUP verir. Çevrimiçi durumu uydurulmaz; presence henüz yoktur.

Local dışındaki adapter gerçek sözleşme sağlanana kadar 503 INTEGRATION_NOT_CONFIGURED döner. Gerçek Butik URL'leri veya şeması varsayılmadı. Davet/oda katılımında üyeliğin yeniden kontrolü sonraki servis adımının gereğidir.

## Hatalar

| HTTP | code | Anlam |
|---|---|---|
| 400 | INVALID_REQUEST | JSON/ek alan/parametre doğrulaması |
| 400 | UNKNOWN_DEMO_USER | Hazır olmayan test hesabı |
| 401 | UNAUTHENTICATED | Eksik, bozuk veya doğrulanamayan JWT |
| 403 | FORBIDDEN | Öğrenci yetkisi yok veya yol henüz açılmadı |
| 403 | NOT_SAME_GROUP | Grup üyeliği yok |
| 404 | SUBJECT_NOT_FOUND | Aktif ders yok |
| 503 | INTEGRATION_NOT_CONFIGURED | Gerçek Butik adapter'ı yok |

Token/özel anahtar/cevap anahtarı loglanmaz. Token içeren MockMvc isteklerinin otomatik çıktısı kapalıdır. Bu belge kimlik/katalog adımını açıklar. Oda ve davet için [lobi sözleşmesine](lobby-api.md), başlatma/cevap/final için [oyun sözleşmesine](game-api.md) bakın.

## Swagger ile deneme

1. Backend'i local profilde başlatıp /swagger-ui/index.html açın.
2. GET /dev/auth/users ile anahtarları görün.
3. POST /dev/auth/token için `{"userKey":"yusuf"}` gönderin.
4. accessToken değerini Swagger Authorize alanına girin; şema Bearer JWT'dir.
5. /me, katalog, puzzle ve grup endpoint'lerini deneyin. emir hesabının 8-A arkadaşlarını okuyamadığını kontrol edin.

Çalışan OpenAPI: /v3/api-docs. [openapi.json](openapi.json) test sırasında gerçek uygulamadan üretilen snapshot'tır; uygulanan lobi ve oyun endpoint'lerini içerir.

Referans: [Spring Security JWT doğrulaması](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html).
