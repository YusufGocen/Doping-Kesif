# Sınıf–ders–konu envanteri ve soru paketi

22 Ekim 2026 — Başlangıç paketi v1.

Bu liste proje için hazırlanan demo içerik kapsamıdır; resmî/güncel müfredatın eksiksiz eşlemesi veya pedagojik onay belgesi değildir. Kullanıcının hedefi 5, 6, 7 ve 8. sınıflar ile farklı derslerdir. Aşağıdaki başlangıç konuları bu hedefin ilk oynanabilir paketidir. Tam yıl kapsamındaki diğer konular sonraki içerik paketlerinde eklenecek.

## Oynanabilir başlangıç konuları

Her hücre bir konu ve 10 özgün, dört seçenekli, tek doğru cevaplı soru içerir.

| Ders | 5. sınıf | 6. sınıf | 7. sınıf | 8. sınıf |
|---|---|---|---|---|
| Matematik | Doğal sayılar ve işlemler | Çarpanlar ve katlar | Tam sayılarla işlemler | Üslü ifadeler |
| Türkçe | Sözcükte anlam | Cümlede anlam | Fiiller ve anlam özellikleri | Fiilimsiler |
| Fen Bilimleri | Maddenin hâl değişimleri | Güneş sistemi | Hücre ve organeller | DNA ve genetik kod |
| İngilizce | Tanışma ve temel ifadeler | Günlük yaşam | Görünüş ve kişilik | Arkadaşlık ve davetler |
| Sosyal Bilgiler | Birey, roller ve sorumluluklar | Harita ve konum | İletişim ve medya | Bu adla sunulmuyor |
| T.C. İnkılap Tarihi ve Atatürkçülük | Sunulmuyor | Sunulmuyor | Sunulmuyor | Millî Mücadele ve Cumhuriyet |
| Din Kültürü ve Ahlak Bilgisi | Güzel ahlak ve davranışlar | Temel değerler ve sorumluluk | Ahlaki tutumlar | Paylaşma ve yardımlaşma |
| Görsel Sanatlar | Görsel sanatın temel ögeleri | Kompozisyon ve renk | Mekân ve perspektif | Görsel tasarım ve yorumlama |
| Bilişim Teknolojileri | Bilgisayarın temel bileşenleri | Dijital güvenlik | Algoritma ve problem çözme | Veri ve dijital okuryazarlık |

Toplam: **9 farklı ders kaydı, her sınıfta 8 ders, 32 yeni konu, 320 yeni soru, 1.280 seçenek**. Önceki Cebirsel İfadeler konusu ve 12 sorusu korunur; böylece yerel veride toplam 33 konu ve 332 soru bulunur. Bu eski fixture kayıtlarının kimlikleri mevcut oyun kayıtlarını bozmamak için değiştirilmedi.

Görsel Sanatlar/Bilişim ve Din Kültürü konu başlıkları proje içi beceri/değer gruplamasıdır. Özellikle Bilişim'in 7–8. sınıfta demo seçeneği olarak bulunması resmî zorunlu ders çizelgesine ilişkin bir iddia değildir. Kurumsal ders/konu listesi gelince eşleme yapılacak.

## Veri kaynağı ve yükleme

- Sürüm kontrolüne giren kaynak: `backend/src/main/resources/content/local-question-bank.json`.
- Sorular çalışma anında yapay zekâdan üretilmez; önceden hazırlanmış içerik PostgreSQL'e yüklenir.
- `LocalQuestionBank` bütün dosyayı doğrular; `LocalDemoSeeder` aynı transaction içinde yükler. Hata oluşursa bu seed işlemi geri alınır.
- Yükleyici yalnızca `local & !prod` profili ve `kesif.local.seed-enabled=true` üzerinden çalışır. Üretime içerik yayını bu otomatik demo seed'iyle yapılmaz.
- Sabit UUID'ler ve `ON CONFLICT DO NOTHING` yeniden başlatmada çift kayıt oluşmasını önler. Mevcut kayıtlar sessizce güncellenmez.
- Bir soruyu düzeltmek için yalnız JSON'u değiştirmek mevcut DB'yi güncellemez. Mevcut oyun snapshot'larını koruyan ayrı, sürümlü içerik güncellemesi gerekir; bu paket insert-only'dir.
- Başlangıç paketinde konu başına yalnızca 10 yeni soru olduğundan tekrar oyunda aynı havuz kullanılır; oyun sırası mevcut motor tarafından rastgele seçilir.
- `Tüm Konular` seçilirse motor aynı sınıf ve dersin yayımlanmış soruları arasından 10 soru seçer. Yeni sınıf/konu için ayrı oyun motoru gerekmez.
- Doğru cevaplar yalnız sunucu kaynak dosyasında ve veritabanında bulunur; katalog DTO'larına eklenmedi. Kaynak dosyası Spring'in statik web dizinlerine konulmadı.

## İçerik kontrolü

Otomatik: sınıf 5–8, tekil ders/konu kodları, konu başına 10 soru, konu içinde tekrar metin olmaması, dört boş olmayan farklı seçenek, geçerli tek cevap indeksi. DB'de tek doğru/4 seçenek ve tekrar seed kontrolleri yapılır. Ayrıca 32 havuzun her biri için iki oyuncuyla 10 turluk tamamlanma ve seçili konu dışında soru gelmemesi entegrasyon testine eklendi.

İçerikler hazırlanırken matematik sonuçları ve cevap–seçenek uyumu gözden geçirildi. Otomatik yapısal testler pedagojik doğruluğu kanıtlamaz. Öğretmen/alan uzmanı incelemesi, zorluk dengesi ve tam müfredat eşlemesi üretim öncesinde bekleyen işlerdir.

## Sonraki içerik işleri

1. Sınıf bazında tüm yılın ders/konu listesi üzerinde kapsamı kesinleştir; örneğin matematikte kesirler/geometri, Türkçede paragraf/yazım, fende diğer üniteler bu paketle tamamlanmış değildir.
2. Her yeni konuya 10 soruluk sürümlü paket ekle; aynı yapısal ve oyun entegrasyon kontrollerinden geçir.
3. Mevcut DB'ye güvenli içerik düzeltme/yayımlama yolunu tasarla. Bir içeriği güncellerken eski maçın soru snapshot'ını değiştirme.
4. Alan uzmanı değerlendirmesiyle sınıf düzeyi, müfredat uyumu ve soru kalitesini onayla.

Frontend, mevcut oynanabilir konuları API'den alabilir. İçeriği bulunmayan başka bir konuyu hazırmış gibi sunmamalıdır. Gerçek Doping soru bankası bağlantısı ileriki entegrasyon olarak kalır.
