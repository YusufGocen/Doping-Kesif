# Backend entegrasyon ve E2E doğrulaması

22 Ekim 2026.

## Kapsam ve yöntem

`BackendE2ETest`, gerçek Spring Boot/Tomcat sunucusunu rastgele yerel portta başlatır. Java HttpClient ile gerçek HTTP istekleri ve WebSocket bağlantıları kullanır. MockMvc, taklit servis veya doğrudan oyun servisi çağrısı kullanılmaz. PostgreSQL test veritabanı gerçek veritabanıdır. Sadece senaryoya özel puzzle hazırlığı JDBC ile yapılır; cevap anahtarı test sırasında veritabanından okunmaz, proje soru paketinden alınır.

İki parametreli tam oyun senaryosu vardır:

1. Oda koduyla aynı gruptaki iki öğrenci katılır.
2. Arkadaş daveti gönderilir, alıcı kendi gelen davetini bulur ve kabul eder.

Her senaryoda:

- Local JWT giriş endpoint'i, profil ve sınıf/ders/konu/puzzle katalogları kullanılır.
- Yetkisiz katalog erişimi, grup dışı kodla katılım, dolu oda ve misafirin oyunu başlatması uygun hatayla reddedilir. Kodla ilgili kontroller kodlu oda senaryosundadır.
- Oda/davet oluşturma ve oyun başlatma tekrarları aynı kaydı verir.
- Gerçek WebSocket AUTH/READY akışı ve zamanlanmış outbox publisher üzerinden canlı olaylar doğrulanır; publisher testten elle çağrılmaz.
- İki öğrenci 10 farklı soruyu yanıtlar; ilk cevapta doğru anahtarı ve karşı oyuncunun yanıtları saklı kalır. Tekrar cevap aynı sıra değerini korur.
- Beşinci soruda misafir bağlantısı kapatılıp yeni WebSocket ile AUTH yapılır; REST aktif oturum snapshot'ı ile aynı oyuna dönülür.
- Her tur iki doğru yanıtla iki parça açılır; maç 20 parçayla tamamlanır.
- Tamamlanma ve ödül olayları WebSocket'ten gelir. Sonuç, XP, koleksiyon ve geçmiş REST üzerinden doğrulanır.
- Yeni test puzzle'ının ilk tamamlanmasında yerel politika gereği kişi başı 80 XP ve 20 koleksiyon parçası beklenir. Sonuç okuma/son devam isteği tekrarları XP artırmaz.
- Oyun bitince aktif oda/oturum boşalır; üçüncü öğrenci oturumu ve sonucu okuyamaz.

Aktif outbox scheduler'ının diğer test sınıflarına sızmaması için E2E sınıfından sonra Spring context kapatılır. XP append-only koruması kaldırılmaz; kaynak geçmişi test DB'sinde korunur, senaryoya özel puzzle sonradan pasif yapılır. Gerçek geliştirme DB'si bu testlerin hedefi değildir.

## Ortam ve tekrar çalıştırma

Docker komutu bulundu; bu agent oturumunda Docker motoruna erişim izin hatası verdi. Testleri atlamak yerine workspace'teki yerel PostgreSQL 16.14 ve ayrı `doping_kesif_test` kullanıldı. Bu durum Docker kurulumunun kullanıcı terminalinde bozuk olduğunu göstermez; Docker/Testcontainers yolu bu çalışmada doğrulanmış sayılmaz.

README'deki test DB değişkenleri veya çalışan Testcontainers ortamıyla backend dizininde:

```powershell
.\mvnw.cmd verify
```

Yönetimli Windows derleyici sorunu için JDK 21 altında mevcut `-Pmanaged-windows-compiler` seçeneği kullanılabilir. Yalnız API E2E sınıfı için:

```powershell
.\mvnw.cmd -Pmanaged-windows-compiler -Dtest=BackendE2ETest test
```

## Sınırlar

Bu testler yerel kimlik/grup adapter'larıyla backend API E2E testleridir. Henüz tarayıcı/frontend E2E, gerçek Doping SSO/Butik entegrasyonu, yük testi veya çok instance doğrulaması yapılmış değildir. Yeni E2E senaryoları kesintiden sonra yeniden bağlanmayı sınar; frontend otomatik retry/buffer kodunun var olduğunu göstermez. Süre aşımı ve eşzamanlı yarış kontrolleri mevcut entegrasyon test paketinde ayrıca bulunur.

## Sonuç

**111 test başarılı; 0 başarısız, 0 hata, 0 atlanan; BUILD SUCCESS.** Bunların ikisi gerçek HTTP/WebSocket API E2E senaryosudur. Maven günlüğünde 0 uyarı ve 0 hata bulundu. Gerçek PostgreSQL 16.14, Temurin JDK 21 ve mevcut managed-windows-compiler profili kullanıldı. Bütün paket düzeltmelerden sonra yeniden çalıştırıldı. Test helper'ı sonunda PostgreSQL sürecini durdurdu; test sunucusu kalıcı kullanıcı sunucusu değildir.

## İlk turda bulunan ve düzeltilen sorunlar

- `@EnableScheduling`, koşullu `LobbyExpiryWorker` sınıfı üzerindeydi. `kesif.rooms.expiry-enabled=false` olduğunda diğer işçiler açık olsa bile zamanlayıcı altyapısı kurulmadığından outbox olayları otomatik yayınlanmıyordu. Annotation uygulama girişine taşındı; oda expiry, oyun deadline ve realtime işçileri artık bu ortak altyapıyı bağımsız kullanır. E2E testi oda expiry kapalıyken gerçek realtime işçisini çalıştırarak bu durumu sınar.
- İlk E2E başarısızlığında açık kalan test oturumu, aynı fixture öğrencileri kullanan sonraki testlerde PLAYER_BUSY hatasına yol açtı. Test temizliği ödül üretmemiş kendi odalarını/oturumlarını kaldıracak şekilde genişletildi. Append-only XP ve kaynak geçmişi silinmez. İlk turdan kalan tek ödülsüz E2E oturumu yalnız test DB'sinde temizlendi.
- İlk tam tur bu sebeplerle başarısızdı; nihai başarılı sonuç düzeltmeler sonrası yeniden çalıştırılan pakete aittir. Bu hatalar gizlenerek önceki 109 test sonucu yeni doğrulama sonucu gibi kullanılmadı.
