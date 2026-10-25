# Doping Keşif ad geçişi

24 Ekim 2026.

Görünen ürün adı **Doping Keşif**; teknik adlar Türkçe karakter içermeyen **kesif** biçimindedir.

- Proje klasörü: outputs/doping-kesif
- Java paketi: com.doping.kesif
- Giriş sınıfı: KesifApplication
- Maven çıktısı: kesif-backend-0.1.0-SNAPSHOT.jar
- REST kökü: /api/v1/kesif
- Canlı bağlantı: /api/v1/kesif/ws
- Ayar kökü: kesif; ortam değişkenleri KESIF_ ile başlar.
- PostgreSQL şeması: kesif; tablolar kesif_ önekini kullanır.
- Yerel geliştirme veritabanı: doping_kesif_dev; ayrı test veritabanı: doping_kesif_test.
- Docker Compose proje/volume ve örnek veritabanı adları yeni teknik adı kullanır.

## Mevcut yerel verinin korunması

Önce tam PostgreSQL yedeği ve kaynak arşivi work/rename-backup altına alındı. Uygulama durdurulduktan sonra mevcut veritabanı yeni geliştirme veritabanına kopyalandı. Yalnız bu kopyanın şeması, tabloları ve ilgili nesne adları değiştirildi. Kimlikler, soru içerikleri, oyun geçmişi, ödül kayıtları ve koleksiyonlar korunur. Önceki veritabanı geri dönüş için bırakıldı; yeni uygulama onu kullanmaz.

Bu proje henüz yerel geliştirme aşamasında olduğu için SQL başlangıç migration dosyaları yeni isimlerle yeniden oluşturuldu. Kopyadaki Flyway metadata bu yeni başlangıç sürümüyle eşleştirildi. Checksum hesabı, önce orijinal dokuz migration ile doğrulandı. Bu yöntem yayınlanmış bir üretim veritabanında doğrudan uygulanacak otomatik bir yükseltme değildir. Yeni kurulumlar normal Flyway migration akışını kullanır; mevcut başka kurulumlar ayrıca yedeklenip taşınmalıdır.

Eski isimli binary çıktılar ve özgün arşiv/yedekler değiştirilemez geçmiş olarak work altında tutulur; kaynak kod ve GitHub yüklemesine dahil edilmez. Kaynak araması bu üretilmiş dosyaları ve arşivleri dışarıda tutar.

## Çalıştırma

Proje kökünde scripts/start-portable.ps1, yeni JAR ve yeni yerel veritabanını kullanır. Docker yolu için .env.example yeni adları içerir; önceden kurulmuş farklı volume kendiliğinden yeni volume'a taşınmaz.

REST/WebSocket adresleri değiştiğinden açık tarayıcı sayfalarında tam yenileme ve yeniden giriş gerekir. Yerel JWT issuer/audience de yeni ada taşınmıştır.

## Kalıcı fixture kimlikleri

Kullanıcı ve soru fixture kimliklerini üreten namespace, ürün adından bağımsız kalıcı veri sözleşmesidir. LocalFixtureIds bu sürümün namespace baytlarını sabit tutar. İsim değişikliği UUIDleri değiştirmez; böylece mevcut soru/konu/yabancı anahtarlar ve kullanıcı geçmişi bozulmaz. İki regresyon testi bu UUIDlerin korunmasını doğrular.

## Yeni klasör ve doğrulama

Windows'taki açık klasör kilidi nedeniyle doğrudan klasör taşıma tamamlanamadı; toplu taşıma girişimi de otomatik onay denetimi tarafından reddedildi. Bunun yerine yeni proje klasörü güvenli kopyayla hazırlandı. Bundan sonraki aktif proje outputs/doping-kesif klasörüdür. Önceki klasör geri dönüş kopyası olarak korunur; GitHub'a bu yeni kök yüklenmelidir.

- Yeni paketlerle backend: 113 test; başarısız/hata/atlanan 0; verify ve paketleme başarılı.
- Yeni proje kökünde frontend: biçim kontrolü, 80 test, TypeScript ve Vite derlemesi başarılı.
- Yeni yerel veritabanında startup sonrası kullanıcı kimlikleri ile katalog, oyun, XP ve koleksiyon sayıları eski kaydın kopyasıyla aynı.
- Dört hesapta gerçek REST giriş/profil/koleksiyon, frontend modülleri ve yeni WebSocket AUTH/READY doğrulandı. Bu kontrol oyun üretmedi.
- Gerçek tarayıcı görsel E2E yeniden yapılmadı.

Kanıtlar: work-rename-backend-final.log, work-rename-frontend-final.log ve work/rename-backup/live-verification.json. Eski loglar, binaryler ve yedekler tarihsel kayıt olarak ad değiştirme taramasına dahil edilmez.
