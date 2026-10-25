# Başlangıç soru paketi — doğrulama

22 Ekim 2026.

## Teslim

- 5–8. sınıflar, her sınıfta 8 ders; toplam 9 farklı ders adı.
- 32 başlangıç konusu, her birinde 10 özgün soru; toplam 320 yeni soru/1.280 seçenek. Eski 12 matematik sorusu korunur.
- JSON kaynak, yükleme öncesi doğrulama, local profille sınırlı transaction içinde insert-only yükleme.
- Mevcut katalog, oda ve oyun API'leri kullanıldı; yeni endpoint, tablo veya migration gerekmedi.

[Envanter](content-inventory.md) hangi konuların hazır olduğunu ve paket sınırlarını listeler. Bu aşama tüm müfredatın tamamlandığı anlamına gelmez.

## Son doğrulama

Temurin JDK 21, Maven 3.9.11, `managed-windows-compiler`, PostgreSQL 16.14 ile `verify`: **109 test, 0 başarısız, 0 hata, 0 atlanan; BUILD SUCCESS**. Maven derleme günlüğünde 0 uyarı. Bu profil/yerel test veritabanı için kurulum ayrıntıları README'dedir.

Yeni kontroller:

- Soru paketi: sınıf sınırı, tam 10 soru, tekil metinler, dört farklı seçenek, geçerli doğru cevap indeksi ve hatalı içeriğin reddi.
- Katalog: dört sınıfın her birinde sekiz oynanabilir ders ve sınıfa göre doğru konu havuzları.
- Veritabanı: 320 yeni soru, her soruda dört seçenek/tek doğru; seed tekrarında çoğalmama.
- Oyun: 4 parametreli test içinde 32 konunun her biri için iki oyunculu 10 turluk tam oyun. Her oturumun 10 farklı sorusu seçilen konuya ait; final COMPLETED.
- Önceki auth, güvenlik, şema, lobi, oyun, ödül ve WebSocket testleri de tekrar geçti.

İlk turdaki tek başarısızlık, 7. sınıfta soru bulunmadığını varsayan eski lobi testindeydi. Boş konu fixture'ı ile içerikten bağımsız hâle getirildi; ardından bütün testler yeniden çalıştırıldı.

Tarayıcı testi veya öğretmen değerlendirmesi yapılmadı. Soruların tümünün pedagojik doğruluğu otomatik test sonucundan çıkarılamaz. İçerik yalnız local ortamda yüklenir; üretim içerik yayını ve sürümlü düzeltmeler sonraki iştir.
