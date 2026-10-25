# Doping Keşif — CEO ve teknik ekip sunum planı

Hazırlık: 25 Ekim 2026. Hedef sunum: Pazartesi, 26 Ekim 2026.
Bu dosya sunum öncesi içerik ve görsel planıdır; PowerPoint henüz üretilmedi.

## Amaç ve ana mesaj

Doping Keşif, iki öğrencinin aynı 10 soruyu cevaplayarak ortak 20 parçalı bir görseli açtığı, Doping platformunun orta alanında çalışan bir öğrenme modülüdür.

Toplantının önerilen çıktısı: sınırlı bir pilotun kapsamı, gerçek platform entegrasyonlarının sorumluları ve yayına hazırlık kriterlerinde anlaşmak. Bu karar beklentisi öneridir; sunum sahibiyle netleştirilir.

15 ana slayt; yaklaşık 15–18 dakika, bunun içinde 2–3 dakika demo. Ardından sorular. Teknik ayrıntılar için 4 isteğe bağlı ek slayt. Her slayt tek mesaj taşır; kod veya endpoint listesi ana akışı doldurmaz.

## Önerilen akış

| # | Slayt başlığı | Verilecek mesaj / içerik | Görsel | Süre |
|---|---|---|---|---|
| 1 | Doping Keşif | Birlikte soru çöz, birlikte keşfet. Ürün adı, sunan kişi, tarih. | Gerçek ana ekranın seçilmiş bölümü ve pusula | 30 sn |
| 2 | Sorudan sonra devam etmek için bir neden | Çıkış varsayımı: görünür ilerleme ve arkadaşla ortak hedef, soru çözmeye devam etme motivasyonunu destekleyebilir. Öğrenci araştırmasıyla doğrulanacak. | Soru → ortak başarı → koleksiyon çizgisi | 45 sn |
| 3 | İki öğrenci, tek keşif | 10 ortak soru, her soruda iki bireysel cevap, doğru cevap başına bir parça; toplam en çok 20 parça. Rekabet yerine ortak hedef vurgusu. | İki avatar ve 20 parçalı puzzle şeması | 50 sn |
| 4 | Mevcut platformun içinde | Sidebar, üst profil/arama ve sağ panel korunur; Keşif orta alanda açılır. Platformla görsel bütünlük. | Tam ana ekran; orta alan işaretli | 40 sn |
| 5 | Bir keşif nasıl başlar? | Görev → sınıf/ders/isteğe bağlı konu → arkadaş veya oda kodu → lobi. | Ayarlar, kod ve lobiden üç okunaklı kırpım | 60 sn |
| 6 | Arkadaşınla aynı sorudasın | Eş zamanlı soru, süre, bireysel cevap ve ortak tur ilerlemesi. | Gerçek soru ekranı | 45 sn |
| 7 | Doğru cevap görünür bir başarıya dönüşür | Kilit sallanır, bulanık kapak ortadan açılır, yeni parça görünür. Özelliğin ayırt edici anı. | 6–10 sn gerçek ekran kaydı veya önce/sonra görüntüleri | 60 sn |
| 8 | Keşif tamamlandı! | 20/20 sonucu, tamamlanma vurgusu, iki oyuncunun katkısı ve kazanımları. | Gerçek tam tamamlanmış sonuç ekranı; büyük görsel | 45 sn |
| 9 | İlerleme bir sonraki oyuna taşınır | Kişisel koleksiyon, tamamlanan görev etiketi ve oyun geçmişi. Oyun içi ortak parça ile kişisel birikimin ayrımı. | Koleksiyon + tamamlandı etiketi kırpımı | 45 sn |
| 10 | Kısa ürün demosu | İki oturumda odaya katılma, hazır olma, bir soruyu cevaplama, parça açılma. Tam sonucu önceden tamamlanmış gerçek oyundan göster. | Canlı uygulama; aynı akışın yedek kaydı | 150 sn |
| 11 | Sistem nasıl çalışıyor? | React/TypeScript → REST ve WebSocket → Java 21/Spring Boot → PostgreSQL. Oyun durumunun ve ödüllerin sahibi sunucu. | Dört bloklu sade mimari diyagram | 70 sn |
| 12 | Veri ve oyun tutarlılığı | Kalıcı sorular ve oyun snapshot'ları; tek cevap, süre kontrolü, tekrar istekte çift ödül oluşmaması; outbox ve yeniden bağlanınca durum eşitleme. | Katalog / oyun / koleksiyon-ödül olarak üç veri grubu | 60 sn |
| 13 | Neyi doğruladık? | Son tam çalıştırmada backend 113, frontend 80 test geçti. REST/WS iki kullanıcı kontrolleri var. Ayrı tarayıcı görsel E2E ve sunum provası hâlâ takip işi. | Üç kısa kanıt kutusu; rapor tarihi dipnotu | 50 sn |
| 14 | Pilotta neyi ölçeceğiz? | Davetten oyuna geçiş, 10 soruyu bitirme oranı, tekrar oynama, soru başarısı ve bağlantı sorunları. Bunlar henüz ölçülmüş ürün sonuçları değil. | Basit dönüşüm akışı ve ölçüm başlıkları | 60 sn |
| 15 | Sonraki adım: kontrollü pilot | Gerçek kimlik/Butik/soru kaynağı entegrasyonu, ortam ve izleme, içerik kontrolü, kabul testleri; pilot kapsamı ve sorumlular için karar. | Bugünkü yerel MVP → entegrasyon → pilot | 60 sn |

## Teknik sorular için ek slaytlar

A1. Veri modeli: kullanıcı/grup, katalog, oda-davet, oyun-tur-cevap, koleksiyon-XP, outbox ilişkileri. 18 domain tablosunun tamamı yerine okunabilir gruplama; ayrıntılı ER diyagramı referans olarak bulunur.
A2. Oyun yaşam döngüsü: oda → hazır → soru → cevap/süre dolması → reveal → sonraki tur → atomik sonuçlandırma. Gerçek enum adları hazırlanırken kodla doğrulanır.
A3. Kimlik ve yetki: JWT doğrulaması, katılımcı yetkileri, WS AUTH ve reconnect. Demo kimliği ile üretim SSO'su ayrımı.
A4. Yayına hazırlık: kalıcı Java servisi, PostgreSQL, frontend dağıtımı, HTTPS/WSS, origin ayarları, izleme ve tek instance sınırı. Sağlayıcı ve maliyet kararı henüz yok.

## Ekran görüntüsü çekim listesi

Gerçek çalışan uygulamadan PNG; mümkünse 1920×1080, aynı yakınlaştırma ve aynı iki demo hesabı. Tam ekran kaynak saklanır; slaytta okunaklı kırpımlar kullanılır. Kavramsal referans tasarımları çalışan ürün görüntüsü diye kullanılmaz. Token, geliştirici konsolu ve oda paylaşım bağlantıları sunuma taşınmaz.

1. 01-ana-ekran.png — /kesif: hero, dört görev ve tamamlanmış görev etiketi.
2. 02-oyun-ayarlari.png — sınıf/ders/konu seçimi; gerçek oynanabilir seçim.
3. 03-oda-kodu.png — oluşturulmuş oda veya katılım ekranı; sunumda kod gerekmezse kırpılır.
4. 04-lobi.png — iki oyuncunun avatarları ve hazır durumları.
5. 05-soru.png — ilk cevap verilmeden, okunabilir soru ve süre.
6. 06-parca-acilma-oncesi.png ve 07-parca-acilma-sonrasi.png — aynı turdan önce/sonra. Tercihen 6–10 saniyelik kayıt da alınır.
7. 08-tamamlanan-puzzle.png — gerçek 20/20 oyunun sonuç ekranı; iki oyuncu da 10/10 ise tüm soruları doğru cevaplama anlatımı yapılabilir.
8. 09-koleksiyon.png — gerçek tamamlanan puzzle ve kişisel ilerleme.

Görseller docs/presentation/assets/ altında toplanacak. Şu an yeni ekran görüntüsü alınmadı: araç önceki istekte Windows tarayıcı URL'sini doğrulayamadığı için durdu. Bu engel çözülmeden SS alındığı iddia edilmeyecek. Projedeki mevcut illüstrasyonlar kapakta destekleyici varlık olabilir; uygulama ekran görüntüsünün yerine geçirilmez.

## Demo ve yedek planı

- Demo kullanıcıları iki bağımsız tarayıcı/profilde önceden hazırlanır. Yerel token bellekte olduğu için yenileme sonrası yeniden giriş gerekir.
- İki pencere aynı makinede aynı localhost köküne bağlanır. Uzak PC demosu dağıtım veya ayrıca ağ kurulumu gerektirir; toplantı günü buna bağımlı kalınmaz.
- 10 soruyu sahnede baştan sona çözmek yerine bir tur canlı gösterilir. Sonuç için mevcut gerçek tamamlanmış oyun kullanılır; veritabanındaki başarı değerleri değiştirilmez.
- Demo öncesi PostgreSQL/backend/frontend health kontrolü, odanın temiz durumu ve iki hesap provası yapılır.
- 60–90 saniyelik yedek ürün kaydı ve ekran görüntülerinden oluşan alternatif akış hazır tutulur.
- Sunum sırasında tüm veriler sıfırlanmaz. İlerleme değişikliği ayrıca istenirse yedekli, kontrollü yapılır.

## Tasarım yönü

16:9; beyaz/açık mavi zemin, ana mavi #106dd4, koyu lacivert başlıklar. Projedeki pusula ve avatarlar kullanılır. Ürün ekranları ağırlıklıdır; slayt başına tek ana görüntü, en çok üç kısa açıklama. Teknik diyagramlar sade ve düzenlenebilir olur. Puzzle açılma ve tamamlanma anları en geniş görselleri alır. Uzun paragraflar, kod blokları ve yoğun tablolar ana sunumda yer almaz.

## Anlatım sınırları

- Bugünkü ürün: iki oyunculu yerel MVP. 4–5 kişilik çok oyunculu oyun varmış gibi gösterilmez.
- Demo grup ve kimlik servisleri gerçek Doping Butik/SSO entegrasyonu değildir.
- Sorular yerel içerik bankasından PostgreSQL'e aktarılır; canlı Doping soru kaynağı bağlantısı henüz yoktur.
- Başarı/bağlılık/öğrenme etkisi veya kullanıcı sayısı uydurulmaz; pilotta ölçülecek hipotez olarak sunulur.
- 113 backend ve 80 frontend testi, son isim geçişi tam doğrulama kaydıdır; sunum öncesi yeniden kontrol edilirse tarih ve sayılar güncellenir. Bu sayılar görsel E2E'nin tamamlandığı anlamına gelmez.
- Ölçek/yük ve üretim güvenliği kabulü tamamlandı denmez. Üretime geçiş ayrı aşamadır.

## Hazırlama sırası

1. Bu 15 slaytlık anlatıyı ve toplantı sonunda istenecek kararı netleştir.
2. Gerçek ekran görüntülerini ve kısa animasyon kaydını topla.
3. Slayt metinleri, mimari/veri şemaları ve konuşmacı notlarını hazırla.
4. PowerPoint ve PDF üret; her slaytı görsel kontrol et.
5. Demo ve süre provası yap; yedek akışı teslim paketine ekle.