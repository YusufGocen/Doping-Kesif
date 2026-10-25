# Koleksiyon, XP ve geçmiş — doğrulama raporu

21 Ekim 2026. Gerçek PostgreSQL 16.14, Java 21 ve Maven verify ile **88 test geçti; 0 başarısız, 0 hata, 0 atlanan; BUILD SUCCESS**. Flyway V9 ve Hibernate şema doğrulaması başarılı; Spring Boot JAR üretildi. Test PostgreSQL'i işlem sonunda kapatıldı. Sürekli açık backend sunucusu başlatıldığı anlamına gelmez.

Başlangıçta önceki 75 test tekrar çalıştırıldı ve başarılı bulundu. Yeni 13 test: RewardIntegrationTest 11, RewardPolicyTest 2. Önceki 75 test de son çalıştırmada geçti.

## Doğrulanan davranışlar

- Tamamlanan oyunun ortak parçaları iki kişisel koleksiyona eklenir; XP kendi doğru sayısından hesaplanır.
- Aynı sonuçlandırma tekrarında ve eşzamanlı iki gerçek transaction commit'inde tek ödül seti ve tek REWARDS_FINALIZED olayı oluşur.
- Farklı oyunların parçaları birleşir; aynı indeks yeniden eklenmez ve ilk kazandıran oturum korunur.
- Koleksiyonun ilk kez 20/20 olması bir defa bonus üretir. Sonraki oyunlarda bonus tekrar verilmez; geçmiş collectionAddedCount sabit kalır.
- Sıfır doğruyla yalnız demo tamamlama XP'si yazılır. Tam 20 parçalı oyunda yerel örnekte oyuncu başına 80 XP hesaplanır.
- Oturumdaki kayıtlı politika kullanılır; güncel miktarlar eski oyunun hesabına uygulanmaz. Snapshot'ı olmayan eski oyunlara ödül verilmez.
- Gerçek GameService son tur devam akışı, oyun sonu ve ödülleri aynı transaction'da tamamlar.
- Ödül işleminin ortasında hata oluşturulduğunda koleksiyon, ledger ve olay yazımları geri alınır; düzeltme sonrası tek seferlik güvenli tekrar başarılıdır.
- Kişisel geçmiş, final sonucunun katılımcı kontrolü, JWT zorunluluğu ve sayfalama/filtre doğrulaması çalışır.
- Koleksiyon filtreleri sıfır, devam eden ve tamamlanan durumları ayırır. Pasif puzzle yalnız mevcut kişisel koleksiyonu olan öğrenciye görünür.
- Yerel demo politika varsayımları yalnız local & !prod altında açılır; prod, local+prod ve prod+local kombinasyonları varsayılan kapalıdır. Eksik/negatif/geçersiz politika reddedilir.

Test veritabanındaki çoğu senaryo rollback ile temizlenir. Gerçek commit gerektiren iki ödül testi rastgele kimlikli, pasif katalog kayıtlarını muhasebe kayıtlarıyla birlikte bırakır; append-only trigger temizlemek için devre dışı bırakılmaz. Bu kayıtlar yalnız ayrı *_test veritabanındadır, hazır yerel öğrenci hesaplarının ilerlemesini etkilemez.

## Çıktılar ve kalan işler

- [API, politika ve Swagger denemesi](progress-and-rewards-api.md)
- [Gerçek uygulamadan üretilen OpenAPI](openapi.json)
- [V9 dahil veri sözlüğü](database-schema.md)

Yerel SHARED_UNION ve 10/2/50 XP varsayımları ürün onayı değildir. Üretimde ödüller açıkça etkinleştirilip kurum miktar/eşleme kuralları verilmelidir. Gerçek kurum XP sistemine aktarım yapılmadı. WebSocket/publisher/reconnect, frontend, gerçek kurum servisleri ve terk/pause/rozet kuralları sonraki kapsamdır. Yük testi ve gerçek dağıtım bu doğrulamaya dahil değildir.
