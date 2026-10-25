# REST oyun motoru — doğrulama raporu

Tarih: 21 Ekim 2026. Java 21, Spring Boot 3.5.16, gerçek PostgreSQL 16.14 ve Maven verify kullanıldı. Docker yerine ayrı doping_kesif_test veritabanı kullanıldı; testler atlanmadı. Önceki aşama başlamadan mevcut 61 test yeniden çalıştırılıp başarılı bulundu.

Sonuç: **75 test, 0 başarısız, 0 hata, 0 atlanan; BUILD SUCCESS.** Flyway V8 ve Hibernate şema doğrulaması başarılı; Spring Boot JAR üretildi. Test PostgreSQL'i işlem sonunda durduruldu. Bu, uygulamanın şu anda sürekli açık bir sunucu olduğu anlamına gelmez.

| Test sınıfı | Adet |
|---|---:|
| ProductionIdentityBoundaryTest | 2 |
| AuthCatalogIntegrationTest | 13 |
| ProductionSecurityTest | 3 |
| SecurityConfigurationTest | 4 |
| DatabaseSchemaIntegrationTest | 10 |
| GameIntegrationTest | 14 |
| InfrastructureIntegrationTest | 1 |
| LobbyIntegrationTest | 23 |
| RoomCodeAndLimiterTest | 4 |
| WebInfrastructureSmokeTest | 1 |
| Toplam | 75 |

## Yeni davranışların kanıtı

- İki hazır oyuncu ve sahip yetkisi olmadan oyun başlamaz; tekrarlanan/eşzamanlı start tek oturum oluşturur.
- Tam 10 farklı soru snapshot'ı; tek konu ve tüm konular seçimi. Başlatırken azalan soru havuzu ve süresi bitmiş lobi reddedilir.
- Doğru key ve cevaplar soru aşamasında gizlidir; gelecek tur için cevap yazılmaz. Yetkisiz öğrenci okuyamaz/cevaplayamaz; geçersiz seçenek ve bilinmeyen alanlar reddedilir.
- Aynı requestId tekrarı tek cevap yazar; değiştirilmiş istek ve yeni anahtarla cevap değiştirme reddedilir. Eşzamanlı iki cevap tek çözüm üretir.
- 0/1/2 parça davranışı; 10 turun sonunda 20 farklı parça ve her oyuncuda 10 doğru. Sonuç idempotent, aktif oda/oturum rezervasyonları serbest, GAME_COMPLETED olayı tek.
- İki devam onayı gerekir; tekrar ve eski devam komutu tur atlatmaz. Devam ile süre dolumu yarışında da yalnız bir sonraki soru açılır.
- Deadline'a tam eşit anda gelen cevap TIMEOUT olur; daha önce verilen doğru cevap korunur. Reveal süresi otomatik ilerler.
- Uzun kesinti benzetiminde geçmiş deadline'lar üzerinden 20 TIMEOUT ve tamamlanmış oturum elde edilir. Worker'ın çağırdığı servis metodu test edilir; gerçek süreç kapatıp yeniden açma/load testi yapılmadı.
- Soru bankası body düzenlemesi, oluşturulmuş tur snapshot'ını değiştirmez.

Geliştirme sırasında bulunan Java nanosaniye/PostgreSQL mikrosaniye yuvarlama farkı giderildi; tam deadline testi geçti. Yeni V8'e göre altyapı testinin beklediği şema sürümü güncellendi.

## Kalan kapsam

Kalıcı kişisel koleksiyon, XP, oyun geçmişi listesi; WebSocket/outbox publisher ve reconnect; terk/pause kuralları; gerçek Doping SSO/Butik/soru bankası; gerçek puzzle varlıkları ve dashboard frontend'i. Local 30/10 saniye süreleri ürün onayı değildir. Ayrıntılı API ve Swagger denemesi: [game-api.md](game-api.md).
