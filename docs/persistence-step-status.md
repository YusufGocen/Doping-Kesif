# Veri modeli adımı — teslim ve doğrulama

Tarih: 21 Ekim 2026.

## Sonuç

Maven verify: **BUILD SUCCESS**. Toplam **18 test**, **0 hata**, **0 başarısız**, **0 atlanan**. Çalıştırılabilir JAR yeniden üretildi.

Bu çalışma sırasında Docker yerine çalışma alanında geçici PostgreSQL **16.14** kullanıldı. Ayrı `doping_kesif_test` veritabanı ve yalnız loopback üzerinden 55432 portu kullanıldı. Sistem PostgreSQL servisi kurulmadı. Test bittiğinde geçici sunucu kapatıldı; test araçları/verileri proje kaynaklarından ayrı `work/` alanında tutuldu. Parola proje kaynaklarına eklenmedi.

## Oluşturulanlar

- 18 domain tablosu ve V2–V6 migration'ları. Önceki V1 değiştirilmedi.
- 18 JPA entity, 18 repository, 8 enum ve ortak BaseEntity.
- Oda/davet/maç ilişkileri ve iki kişilik rezervasyon modeli.
- Değişmez soru snapshot'ı, tek cevap ve tek parça kısıtları.
- Kalıcı koleksiyon, append-only XP ledger ve tekil outbox sırası.
- Güncel [veri sözlüğü](database-schema.md), [ER diyagramı](er-diagram.md), [test planı](persistence-test-plan.md) ve karar kaydı.

## Doğrulananlar

- Flyway ilk kurulum V1–V5 ve ardından V6 ileri migration'ını uyguladı; tekrar açılışta checksum/up-to-date doğrulaması geçti.
- Hibernate `ddl-auto=validate` ile 18 entity'nin şemaya uyumu kontrol edildi.
- Katalog ve profil repository'leri üzerinden UUID, auditing, JSON ve enum persistence çalıştı.
- FK, CHECK, partial UNIQUE, ertelenmiş owner üyelik FK'si ve immutability trigger'ları test edildi.
- İki farklı JDBC bağlantısından aynı oyuncu/tur yanıtı eşzamanlı yazıldı: biri başarılı, diğeri unique ihlali; sonuç tek kayıt.
- PostgreSQL bağlıyken gerçek Swagger/OpenAPI ve health yanıtları geçti.
- Local/üretim doküman erişimi ve kapalı iş API güvenlik kontrolleri geçti.

## Henüz uygulanmayanlar

JWT token üretme/doğrulama, kullanıcı DTO'ları, katalog endpoint'leri, Butik gateway, oda/davet/lobi servisleri, durum geçişleri, oyun motoru, süre/terk politikaları, ödül hesaplama, outbox publisher, WebSocket endpoint'leri ve frontend.

Veritabanı kısıtlarının geçmesi, servis iş kurallarının tamamlandığı anlamına gelmez. Tam iki hazır oyuncu, tam 10 soru, aynı Butik grubu, doğru cevabın ödüllendirilmesi ve idempotent final sonraki servis aşamasında uygulanacaktır.

## Sıradaki adım

Local JWT test kimlikleri ve güvenli `/me`; ardından katalog/puzzle API'leri, local içerik fixture'ları ve Butik adapter'ı. Aynı grup dışına oda koduyla erişim henüz onaylanmadı. Süre, XP ve koleksiyon eşleme kararları açık tutuluyor.
