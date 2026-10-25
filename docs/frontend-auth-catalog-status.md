# Frontend — yerel oturum ve gerçek katalog entegrasyonu

22 Ekim 2026.

## Kullanılabilir akış

http://localhost:5173/kesif adresinde üstteki ayrı **Yerel test hesabı** alanından bir öğrenci seçilir. Token, local backend'den alınır; `/me` ile profil ve STUDENT rolü doğrulandıktan sonra uygulama oturumu açılır. Üst profil adı güncellenir.

Ardından orta alanda gerçek puzzle metadata'sı, 5–8. sınıflar, sınıfa uygun dersler ve isteğe bağlı konu seçimi gösterilir. Sınıf değişince ders/konu, ders değişince konu temizlenir. Oynanabilir olmayan içerikler devre dışıdır. Seçim özeti gösterilir; henüz oda veya davet oluşturulmaz.

Puzzle kapakları, backend'deki bilinen demo kodları için hazırlanmış özgün yerel SVG çizimleridir. Backend henüz gerçek resim dosyası sunmaz; kırık/uydurma görsel URL'si kullanılmadı. Parça ilerlemesi/XP sahte sayılarla gösterilmez.

## Oturum ve veri izolasyonu

- `shared/session/`: uygulama başına ayrı, yalnız bellekte oturum; localStorage/sessionStorage/cookie token kaydı yok.
- Süre dolumunda timer, focus/visibility veya sonraki istek kontrolü oturumu kapatır. Yerel token otomatik yenilenmez; yeniden hesap seçimi gerekir. Sayfa yenileme de yeniden giriş gerektirir.
- Hesap/token değişince devam eden query'ler iptal edilir ve Query cache temizlenir. Seçim bileşeni yeni kimlikle yeniden kurulur; önceki hesabın seçimleri taşınmaz.
- 401 callback, istekte kullanılan token'ı taşır. Önceki hesabın geç dönen 401 cevabı yeni hesabı kapatamaz.
- Başarısız/iptal edilmiş veya eski revision'a ait login sonucu yeni oturum olarak yayınlanmaz.
- Local hesap aracı sadece Vite geliştirme modunda ve `VITE_ENABLE_LOCAL_AUTH` kapalı değilse görünür. Production build bu aracı göstermez; gerçek SSO entegrasyonu henüz yapılmadı. Backend local/prod sınırı korunur.

## Mimari

`features/auth` kullanıcı seçimi, token/Me şeması ve login API'sini; `features/catalog` API/query ve seçim bileşenlerini içerir. `app/pages/DiscoveryEntryPage.tsx` bu bağımsız modülleri birleştirir. Modüller birbirini import etmez. Layout yalnız ortak session hook'u üzerinden kullanıcı adını okur. Backend kodu/tablo/migration değiştirilmedi.

## Gerçek HTTP smoke doğrulaması

Çalışan frontend proxy'si ve backend ile:

```powershell
cd frontend
npm.cmd run smoke:catalog
```

Script yalnız localhost hedeflerini kabul eder, uygulamanın gerçek API istemcisini ve Zod şemalarını Vite üzerinden yükler. Token/profil/katalog yollarını gerçek HTTP ile doğrular, token değerlerini yazdırmaz. Oyun/oda/XP oluşturmaz.

Yusuf ve Ayşe için ayrı ayrı **PASS**: 4 sınıf, 4 puzzle, toplam 32 sınıf-ders seçimi ve 33 konu. Girişsiz katalog isteği 401 olarak doğrulandı. Bu test browser UI E2E değildir.

## Otomatik testler ve sınırlar

Yeni testler: kimlik çözülmeden katalog isteği yapmama; filtre bağımlılıklarını sıfırlama; hesap değiştirme/çıkış; login hatası; ders sorgusu hata/tekrar deneme; oturum izolasyonu, son geçerlilik anı, eski 401 reddi; ekrandan otomatik süre dolumu.

Bir tam turda cold lazy import'lar Windows ortamındaki varsayılan 1 saniyelik DOM bekleme sınırını aştı. Merkezî test setup'ında gözlenebilir UI bekleme sınırı 5 saniyeye, eşzamanlı işçi sayısı 2'ye alındı; assertion'lar kaldırılmadı, keyfî sleep eklenmedi. Tam kontrol tekrar çalıştırıldı; nihai sonuç ilerleme kaydındadır.

Gerçek tarayıcı görsel/responsive/native dialog doğrulaması hâlâ yapılmadı. Davet, oda kodu, lobi, oyun, kişisel koleksiyon/geçmiş ve WebSocket reconnect istemcisi sonraki aşamadır. Önceki backend testleri bu frontend çalışmasında tekrar çalıştırılmadı.


## Nihai sonuç

Son check başarılı: 8 dosyada **42 test geçti**, atlanan yok; format, TypeScript ve production build başarılı. Son gerçek HTTP smoke iki hesapta da PASS. Önizleme /kesif HTTP 200. Uygulama açık bırakıldı.
