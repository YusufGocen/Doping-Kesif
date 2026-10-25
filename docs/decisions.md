# Karar ve ilerleme kaydı

## 22 Ekim 2026 — Proje içi soru bankası

İlk sürümde Doping soru bankası bağlantısı beklenmeden, proje için hazırlanan sorular PostgreSQL'den sunulur. Kapsam 5–8. sınıflar ve farklı derslerdir. İlk paket her sınıfta sekiz ders için 32 konu / 320 soru içerir; eski 12 soru korunur. Bu paket tam müfredat değildir. Kaynak JSON doğrulanarak yalnız local profilde, insert-only ve transaction içinde yüklenir. Mevcut DB kayıtlarının düzeltilmesi ayrıca sürümlü içerik güncellemesi gerektirir. Yeni tablo/migration eklenmedi. [İçerik envanteri](content-inventory.md), kapsamı ve sonraki içerik işlerini listeler.

## 22 Ekim 2026 — Canlı bildirim ve outbox

- Raw WebSocket endpoint /api/v1/kesif/ws; token URL'ye konulmaz. İlk AUTH mesajı 5 saniyede JWT doğrular; STUDENT ve geçerli exp zorunludur. Cookie kimlik sağlamaz, Origin listesi ve query reddi uygulanır.
- Kullanıcıya kendi akışı açılır; istemci oda/başka kullanıcı aboneliği belirleyemez. ROOM alıcıları katılımcı+davetli, SESSION alıcıları yalnız oturum katılımcılarıdır.
- EVENT yalnız aggregate kimliği/türü, olay türü, eventId ve sequence taşır; özel payload/cevap/kod yayınlanmaz. Komutlar ve durum REST'tedir.
- Publisher commit edilmiş satırları kilitler; aggregate sırası korunur, başarısız dispatch artan gecikmeyle tekrar denenir. Tekrar bildirim mümkündür. published_at bireysel tarayıcı ACK'i değildir.
- READY her bağlantıda REST eşitlemesi ister. Aktif oda/oyun, davetler ve kişisel ilerleme yenilenir; tamamlanmış/çevrimdışı oyun için history/result kullanılır. Frontend retry/buffer uygulaması ekran aşamasındadır.
- Mevcut fanout tek backend instance için; çok instance öncesi broker/pub-sub gerekir. Redis/RabbitMQ eklenmedi. Tablo/migration değişmedi; V9 ve 18 tablo korunur.

102 test gerçek PostgreSQL ve gerçek WebSocket istemcileriyle geçti; 0 hata/atlanan. Windows derleme erişim sorunu için JDK 21 altında isteğe bağlı managed-windows-compiler profili eklendi; varsayılan javac korunur. Sözleşme: [realtime-protocol.md](realtime-protocol.md); doğrulama: [realtime-step-status.md](realtime-step-status.md).

## 21 Ekim 2026 — Kalıcı koleksiyon, XP ve geçmiş

- Yeni oyunların ödül politikası başlangıçta snapshot'a alınır. Oyun sonunda koleksiyon, ledger, finalized_at ve outbox aynı transaction'da tamamlanır; hata kısmi ödül bırakmaz.
- Local örnek politika: SHARED_UNION ile ortak parçalar iki kişisel koleksiyonda birleşir; 10 tamamlama + doğru başına 2 + ilk 20/20 için 50 XP. Ürün onayı değildir. Local dışı varsayılan kapalı; açılması açık miktar/eşleme ister. Karışık prod/local profili demo konfigürasyonunu yüklemez.
- Oda kilidi ve oyuncu UUID sırasındaki koleksiyon kilitleri; unique parça ve XP dedupe anahtarları; session finalized işareti çift ödülü engeller. XP append-only DB koruması kaldırılmadı.
- V9 rewards_finalized_at ve collection_added_count ekler; toplam 18 tablo. Kişisel geçmiş/endeks ve yetkili final sonucu API'leri uygulanır.
- Eski/ödülsüz başlayan oturumlara güncel politika uygulanmaz. Gerçek kurum XP/rozet sistemine aktarım yapılmaz. Sonraki teknik aşama WebSocket/publisher/reconnect.

88 test gerçek PostgreSQL ile geçti; 0 hata/atlanan. Sözleşme: [progress-and-rewards-api.md](progress-and-rewards-api.md); doğrulama: [rewards-step-status.md](rewards-step-status.md). Önceki aşama kayıtları tarihsel kapsamı anlatır.

## 21 Ekim 2026 — REST oyun motoru

- İki aktif/hazır oyuncu ve güncel grup üyeliğiyle sahip start komutu verir; oda başına tek oturum. Hazır olmak kendiliğinden başlatmaz.
- Aynı sınıf/ders ve isteğe bağlı konudan 10 farklı yayımlanmış soru seçilir, body/seçenek/sürüm kalıcı snapshot olur. Doğru key REVEAL öncesi API'ye verilmez.
- İlk cevap geçerlidir; oyuncu genelinde requestId tekilliği ve payload kontrolü retry korur. İki cevap veya kalıcı deadline çözümü bir kez üretir; doğru başına bir ortak parça açılır.
- İki devam onayı veya reveal deadline sonraki soruya geçirir. Onuncu REVEAL ardından COMPLETED/CLOSED ve rezervasyonların bırakılması atomiktir.
- Kilit sırası oda → oturum/alt kayıtlar; outbox aynı transaction'da sıralı yazılır. Canlı publisher henüz yoktur.
- Local 30 saniye soru / 10 saniye reveal yalnız demo değeridir. Üretim açık süre ister; oturum rules_snapshot ayar değişikliğinden etkilenmez. Zamanlar DB ile aynı mikrosaniye hassasiyetindedir.
- Worker her oturum için ayrı transaction açar. Geçmiş deadline'lar restart'ta sıfırlanmaz; uzun kesintide cevaplanmayan oyun timeout'larla tamamlanır. Terk/pause/ceza kuralı eklenmedi.
- V8 yalnız REVEAL deadline indeksini ekler; eski migration değişmedi.
- Kalıcı koleksiyon/XP henüz güncellenmez. Sonraki finalization adımı idempotent olmalı; GAME_COMPLETED ödül verildiği anlamına gelmez.

75 test gerçek PostgreSQL ile geçti; 0 hata/atlanan. Sözleşme ve demo: [game-api.md](game-api.md); doğrulama: [game-step-status.md](game-step-status.md). Önceki aşama raporları tarihsel kayıttır.

## 21 Ekim 2026 — Davet, kodlu oda ve lobi

- Davet/kod aynı odaya ve iki kişilik roster'a bağlandı. Hazır olmak GameSession başlatmaz; oyun motoru sonraki adımdır.
- Sahip+clientRequestId tekilliği V7'de eklendi; retry aynı kayda gider, farklı seçim/davetli 409 verir.
- Kod HMAC ile türetilir ve doğrulanır; düz kod yalnız sahibinin aktif lobi DTO'sunda görünür. Düz kod DB, URL ve outbox'a konulmaz.
- Local ephemeral key restart'ta çözülemeyen açık kodlu lobileri kapatır. Kalıcı ROOM_CODE_SECRET Base64 en az 32 byte; üretimde zorunlu.
- Local TTL örnekleri 5 dakika oda/2 dakika davet, teknik sınır 30 saniye–1 saat. Bunlar ürün onayı değildir; üretim açık süre konfigürasyonu ister.
- İki kişilik MVP'de herhangi bir katılımcı ayrılınca lobi kapanır; sahip devri/misafir değiştirme yapılmaz. Bu davranış ürün incelemesine açık öneridir.
- Katılım/kabulde sahip ve katılan; hazır olmada iki katılımcı da grup üyeliği açısından yeniden doğrulanır.
- Lobi kilit sırası profil FOR NO KEY UPDATE → tek oda FOR UPDATE. JPA pre-lock cache'i refresh edilir; başka aktif oda kilidi alınmaz. Oyun/round/collection alt kilit sırası ileride ayrıca uygulanır.
- Outbox aynı transaction'da, room event_sequence ile yazılır. Publisher/WebSocket henüz yoktur.
- Join ve oluşturma için ayrı kullanıcı pencereleri, varsayılan 10/dakika; en fazla 10000 bellek penceresi. Dağıtık limit altyapısı sonraki ihtiyaçtır.
- Expiry worker 30 saniyede en fazla 100 oda işler; yetkili snapshot da expiry uygular. Yeni oda açmadan aktif oda snapshot'ıyla eşitleme önerilir.
- 61 test gerçek PostgreSQL ile geçti; 0 hata/atlanan. Sıradaki iş oyun motorudur.

Detay: [lobby-api.md](lobby-api.md), [lobby-step-status.md](lobby-step-status.md).

## 21 Ekim 2026 — JWT ve katalog adımı

- Local kimlik: bellekte geçici RS256 anahtar, yalnız hazır hesaplar, 15 dakika erişim token'ı. Token ve seed local & !prod profilinde bulunur; karışık prod profilleri de bu koşulu korur.
- Local dışı kimlik: zorunlu issuer/audience ve HTTPS JWKS; Doping claim/API sözleşmesi hazırmış gibi davranılmaz. Varsayılan roles listesinin STUDENT/ADMIN değerleri adapter sözleşmesidir, kurum tarafından henüz onaylanmadı.
- Yalnız header tabanlı bearer kullanımı nedeniyle CSRF kapalı, session/request cache yok. Cookie auth eklenirse yeniden değerlendirme zorunlu.
- Katalog gerçek aktif/yayınlanmış soruları sayar; 10 soruluk uygunluk eşiği bilinen oyun kuralıdır. Demo yalnız 8. sınıf matematikte oynanabilir içerik sağlar.
- Local fixture'lar ApplicationRunner transaction'ında insert-only ve idempotent; Flyway üretim şemasına test verisi karıştırılmaz.
- /me profili trusted sub ile idempotent oluşturur; istemci kullanıcı kimliği veya rol atayamaz.
- Butik arayüzü local fixture kullanır; local dışı adapter 503 INTEGRATION_NOT_CONFIGURED verir. Presence üretilmez.
- 34 test gerçek PostgreSQL ile geçti; atlanan test yok. Sıradaki iş davet/oda/lobi servisleri.

Detaylar: [API sözleşmesi](auth-and-catalog-api.md), [doğrulama](auth-catalog-step-status.md).

## 21 Ekim 2026 — Veri modeli ve persistence adımı

Bu bölüm ilk altyapı adımındaki henüz oluşturulmamış tablo açıklamalarını günceller.

- Güncel model 18 domain tablosu içerir: önceki 16 tabloya ortak oda ve kalıcı oda üyeliği eklendi. Üyelik cache'i eklenmedi.
- Davet/kod aynı odaya bağlanır. Maç room_id UNIQUE üzerinden oluşur; zorunlu davet ve session/invitation çift yönlü FK kaldırıldı.
- Sınıf/ders/tüm konular seçimi desteklenir. Topic doluysa composite FK sınıf/ders uyumunu denetler.
- Aktif oda ve aktif maç için oyuncu başına rezervasyon unique index ile korunur. Terminal servisler active bayraklarını transaction içinde serbest bırakacaktır.
- Round snapshot DB trigger'ı ile değiştirilemez. Doğru cevap ayrı tutulur. İstemci DTO'ları henüz yazılmadı.
- Tur TIMEOUT durumu yerine AnswerSource.TIMEOUT kullanılır. Maç terminal başarı adı COMPLETED olarak birleştirildi.
- room → session → round → collection kilit sırası önerisi belgelendi. Kritik repository'lerde pessimistic lock sorgusu hazır; henüz servis yok.
- XP toplamı profile'a kopyalanmadı; ledger otoritedir. İhtiyaç doğrulanırsa toplam projection ayrıca tasarlanır.
- V1 değiştirilmedi; yeni V2–V6 migration'ları eklendi. V6, uygulanmış V3/V5'i değiştirmeden oda/maç puzzle eşitliği ve append-only XP koruması ekler. Prod/dev seed eklenmedi.
- Tüm entity'ler UUID referanslarıyla eşlenir; ORM cascade yok. Ortak id, created_at, updated_at, version alanları BaseEntity'de bulunur.
- Şema ve ORM, servis katmanının kimlik/üyelik/state machine denetimlerinin yerine geçmez.

Güncel kolonlar: [database-schema.md](database-schema.md). İlişkiler: [er-diagram.md](er-diagram.md). Önceki ZIP belgeleri değişmeden referans olarak korunur.

## 21 Ekim 2026 — İlk altyapı adımı

Kullanıcı proje klasörünün oluşturulmasını ve ilk adıma başlanmasını istedi. Eski referans belgelerdeki bekleme talimatları bu güncel geliştirme yetkilendirmesini değiştirmez.

### Uygulanan kararlar

- Proje outputs/doping-kesif altında; kaynak ZIP değişmedi, Markdown dosyaları docs/reference içine kopyalandı.
- Java 21 + Spring Boot 3.5.16 + springdoc 2.9.1; Maven 3.9.11 resmi Wrapper ile sabit.
- Önceki 3.x planı korundu; üretim için support/lisans ve 4.x geçiş değerlendirmesi açık.
- PostgreSQL 16.14-alpine; Docker portu yalnız localhost'a bağlı.
- Flyway şemayı yönetir; ilk migration yalnız schema açıklaması içerir. Domain tabloları henüz yazılmadı.
- İstemciler için API prefix önerisi /api/v1/kesif. Henüz iş endpoint'i yok.
- JWT uygulanana kadar iş erişimi denyAll. Basic/form login kurulmadı. CSRF, JWT tabanlı komut güvenliği tasarlanana kadar açık kaldı.
- Swagger yalnız local; health ayrıntısız olarak açık.
- Varsayılan profil otomatik local değildir; dış ortam açık datasource bilgisi gerektirir.
- İlk aşamada gerçek Doping servis bağlantısı, frontend ve oyun motoru yok.

### Bekleyen kararlar

- Oda koduyla erişimin aynı Butik grubu dışına açılması onaylanmadı; mevcut plan aynı grup kontrolünü korur.
- Soru/reveal/reconnect süreleri, terk ödülleri, XP ve koleksiyon eşlemesi kesin değil.
- Oda modelinin eklenmesiyle eski 16 tablo envanteri güncellenecek.
- Mevcut platform frontend kodu/tema ve kurum servis sözleşmeleri paylaşılmadı.

### Sonraki iş paketi

Tam DB sözlüğünü; room, invitation, session kaynak ilişkileri, soru snapshot'ı ve Tüm Konular seçimini içerecek şekilde birleştir. Ardından Flyway V2 ve sonraki migration'lar, JPA modelleri ve gerçek JWT local test akışı ayrı adımlarda geliştirilsin.
