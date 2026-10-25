# Doping Keşif — frontend mimarisi

22 Ekim 2026. Yeni özelliklerden önce mevcut dashboard bu yapıya taşındı. Hedef, tek dosyalı prototipten sorumlulukları belirli, test edilebilir bir uygulama temeline geçmektir; gerçek kurum entegrasyonu veya üretim kabulü tamamlandı anlamına gelmez.

## Klasörler ve sorumluluklar

```text
frontend/
  src/
    main.tsx                         Tek başlangıç; router bir kez oluşturulur
    app/
      App.tsx                        Provider ve router bileşimi
      router.tsx                     URL ağacı, lazy sayfalar, yönlendirme/hata
      providers/AppProviders.tsx      QueryClient ve API bağımlılığı
      pages/                         Uygulama düzeyi 404 ve hata sayfaları
      architecture.test.ts           Katman bağımlılık sınırlarının kontrolü
      router.test.tsx                 URL/404/dönüş kontrolleri
    layouts/dashboard/
      DashboardLayout.tsx            Sidebar + üst alan + Outlet + sağ panel
      DashboardContext.tsx           Yalnız kabuğun geçici UI durumu
      types.ts                       Kabuğa ait tip ve Outlet sözleşmesi
      config/navigation.ts           Platform menü tanımları
      components/                    Sidebar, Topbar, RightPanel, Footer, ShellDialogs
      dashboard.css                  Kabuğun stilleri ve responsive kuralları
      __tests__/                     Mevcut etkileşim regresyonları
    features/
      discovery/
        pages/DiscoveryHomePage.tsx   Sayfanın bileşimi
        components/                  WelcomeHero, DiscoveryFacts (referans banner ve bilgi kutuları)
        styles/home.css              Keşif ana sayfasının stilleri
      auth/                          Yerel kullanıcı/token/Me akışı ve hesap aracı
      catalog/
        api/catalogApi.ts            Katalog HTTP uçları
        api/queries.ts               Parametreli Query anahtarları ve iptal sinyalleri
        model/schemas.ts             Runtime DTO doğrulaması ve türetilen TS tipleri
        api/*.test.ts                Sözleşme/filtre/cache sınırları
    shared/
      api/                           Fetch istemcisi, ApiError, ApiProvider, testler
      config/env.ts                  Açık istemci yapılandırmasının doğrulanması
      ui/                            Button, Dialog, Toast ve ortak stiller
      hooks/                         Ortak odak yönetimi
      lib/                           Tarih yardımcıları
      brand/                         Ortak marka temsili
      session/                       Bellekte kimlik, süre dolumu ve ortak oturum hook'u
      illustrations/                 Ortak vektör görseller
    styles/
      tokens.css                     Marka, yüzey, metin, border/focus, layout ölçüleri
      base.css                       Temel HTML, tipografi, reset
      index.css                      Ortak stil giriş noktası
  .env.example                       Yalnız açık API URL'si
  .prettierrc.json                    Ortak biçim standardı
  package-lock.json                  Tekrar üretilebilir bağımlılık ağacı
```

Boş `services/utils/types` depoları açılmadı. Tipler ait oldukları modülde durur; katalog TypeScript tipleri Zod şemalarından türetilir. Aynı DTO'nun birbirinden kopabilecek iki tanımı tutulmaz. Daha sonra lobi ve oyun için kendi `features/` modülleri açılacak.

## Bağımlılık yönü

| Katman | Kullanabileceği yerler |
|---|---|
| app | layouts, features, shared ve uygulama kütüphaneleri |
| layouts | Kendi kabuk kodu ve shared; oyun modüllerini içe almaz |
| feature | Kendi modülü ve shared; başka feature veya app/layout iç yapısını içe almaz |
| shared | Yalnız shared ve bağımsız kütüphaneler |

`@/` alias'ı hem Vite hem TypeScript'te tanımlıdır. Katman testi statik import/export ve literal dinamik importları denetler. Sayfa/layout içinde doğrudan fetch kullanımını da reddeder. Bu kontrol bir güvenlik sandbox'ı değil, kaynak mimarisi kalite kapısıdır.

Dashboard sayfayı import etmez; React Router `Outlet` kullanır. Sayfanın yardım eylemi Outlet context üzerinden verilir. Sidebar gezinmesi gerçek `NavLink` ile yapılır. Genel UI bileşenleri backend, router veya Keşif iş kurallarını bilmez.

## Routing ve hata sınırı

- `/` → `/kesif` replace yönlendirmesi.
- `/kesif` → lazy yüklenen Keşif sayfası; sayfanın JS/CSS çıktısı ayrı chunk olur.
- Bilinmeyen URL → aynı kabuk içinde 404 ve geri dönüş bağlantısı.
- Route yükleme/render hatası → genel hata ekranı ve tekrar deneme. Ham exception/stack ürün ekranında gösterilmez.
- Root router `main.tsx` içinde bir kez yaratılır; testler kendi memory router'ını enjekte eder. StrictMode effect temizliği router'ı yanlışlıkla dispose etmez.
- Henüz yapılmamış lobi/oyun sayfaları boş route olarak açılmadı. Kimlik oturumu henüz bağlanmadığından sahte bir authenticated route guard yoktur.

## API ve veri yönetimi

- Tek HTTP transport: `shared/api/client.ts`. Varsayılan prefix mevcut backend ile uyumlu `/api/v1/kesif`; ürün adı değişikliği API namespace'ini değiştirmez.
- `VITE_API_BASE_URL`, sadece public build yapılandırmasıdır. Şifre/token/frontend secret içermez. Varsayılan yerel Vite proxy'si korunur.
- GET/POST gövdeleri JSON; 204 için açık şema desteği. Yanıtlar `unknown` olarak alınır, özellik modülünün runtime şemasından geçmeden sayfaya verilmez.
- İsteğe bağlı token sağlayıcısı, 401 callback, 15 saniye timeout ve çağıranın AbortSignal desteği vardır. Mutasyonlar transport tarafından otomatik tekrarlanmaz.
- Cookie kimliği gönderilmez; redirect'ler takip edilmez. İstek yolu base dışına çıkamaz; dış URL/parent traversal reddedilir. Bu, tam güvenlik denetiminin yerine geçmez.
- `ApiError` durum ve business code taşır; ham sunucu cevabı, stack veya token loglanmaz/gösterilmez. Ağ, iptal, timeout, geçersiz response ve HTTP hatası ayrılır.
- TanStack Query sunucu cache'ini yönetir; query anahtarlarında sınıf/ders parametreleri bulunur. Mutasyon retry kapalı, uygun ağ/5xx sorgu hatasında en fazla bir retry vardır.
- UI durumu yerel bileşenlerde; kabuğa ortak panel/compact/toast durumu yalnız DashboardContext'tedir. Sunucu durumu bu context içine kopyalanmaz.

**Güncelleme: yerel öğrenci girişi ve gerçek katalog ekranı bağlandı.** `features/auth` ve `features/catalog`, app katmanındaki DiscoveryEntryPage içinde birleştirilir. Oturum yalnız bellektedir; token süresi/401 denetlenir. Hesap değişiminde query iptali/cache temizliği ve seçim sıfırlaması yapılır. Local hesap aracı production build'de gösterilmez. Gerçek SSO/refresh henüz yoktur; oyun sırası/puan/parça otoritesi backend'de kalır. Ayrıntı: [oturum ve katalog raporu](frontend-auth-catalog-status.md).

## Stil ve bileşen kuralları

- Renk/temel ölçü değişiklikleri önce tokens'tan yapılır. UI, layout ve feature stilleri kendi sahiplerinin yanında tutulur; eski tek `styles.css` kaldırıldı.
- İlk görsel tasarımla uyumu korumak için mevcut class adları sürdürüldü. Ortak CSS reset ve UI stilleri globaldir; component ownership açıkça ayrılmıştır. Yeni stiller kendi modülünde adlandırılır, global etiket seçiciler feature içine eklenmez.
- Hero, bilgi kartları ve rehber; sayfadan ayrı bileşenlerdir. `DiscoveryHomePage` sayfa bileşimidir, HTTP/context iş motoru değildir.
- Native dialog, erişilebilir adlar, skip link, odak halkası, çekmece odak döngüsü ve reduced-motion desteği korunur.
- Font bildirimi HTML girişine taşındı; font bağlantısı yoksa sistem fontuna dönülür. Resmî kurum font/logo varlıkları beklenir.

## Kalite kapıları

```powershell
cd frontend
npm.cmd ci
npm.cmd run check
```

`check`: format kontrolü → Vitest → TypeScript + production build. Ayrı komutlar: `test`, `typecheck`, `build`, `format`, `format:check`. İlgili testler kaynakla birlikte tutulur. `.github/workflows/frontend-ci.yml`, Node 24 üzerinde aynı kapıyı çalıştırmak üzere hazırlandı; uzak GitHub çalıştırması bu adımda yapılmadı.

Kapsam: dashboard davranışları; root/404 routing; katman sınırları; bearer/cookie/redirect politikası; response schema; 204; 401/iş hatası; timeout/cancel; unsafe path reddi; katalog filtre kodlaması ve cache ayrımı.

Gerçek tarayıcı ekran görüntüsü, piksel/responsive onayı, native dialog/odak ve frontend/backend iki tarayıcı E2E henüz tamamlanmadı. jsdom testleri bunların yerine sayılmaz. Üretim SSO, erişilebilirlik denetimi, izleme ve yük kabulü daha sonra doğrulanacak.

## Referans ekran ayrımı — 22 Ekim güncellemesi

DiscoveryEntryPage, DiscoveryHomePage ve PuzzleGallery bileşimini yapar. Ana sayfada sınıf/ders formu bulunmaz. DiscoverySettingsPage seçilen görev parametresini GameSettings bileşenine aktarır. Sayfalar app katmanındadır; catalog özelliği auth özelliğini içe aktarmaz. Kimlik shared/session üzerinden okunur.

PuzzleGallery, görevleri ve koleksiyon ilerlemesini doğrulanmış API katmanından alır. Giriş öncesi yalnız önizleme metadatası kullanır. Görseller public/images/discovery altında; üretim bilgileri docs/discovery-assets.md dosyasındadır. Eski CatalogExplorer ve pusula çizimi aktif sayfalarda kullanılmaz.

## Giriş yönlendirmesi

LoginPage bağımsız app sayfasıdır. RequireSession, DashboardLayout erişimini oturuma göre sınırlar. Kullanıcı kartları auth özelliğindeki LocalAccountPanel üzerinden mevcut API ve shared/session katmanını kullanır. Keşif ve ayar sayfalarında hesap seçici bulunmaz. Profil penceresi store.clear ile çıkış yapar; koruma yönlendirmeyi gerçekleştirir.


## Oyun modülü

features/game: doğrulanan snapshot şeması, gameApi, GameLaunch/GameRecovery/GameScreen ve game.css. RoomLobby, gameControls ReactNode slotunu app/RoomLobbyPage üzerinden alır; social→game bağımlılığı yoktur. /kesif/oyun/:id route'u app/GamePage üzerinden açılır. Cevap istekleri yalnız backend sözleşmesindeki iki alanı gönderir. Durum backend otoritesindedir; deadline yerel sayaçta gösterilir, sonuç üretilmez. Polling oturum tamamlandığında durur. Gerçek HTTP doğrulama script'i scripts/smoke-game.mjs içinde bulunur.

## Kalıcı ilerleme modülü

features/progress altında api/progressApi.ts, model/schemas.ts, ResultScreen, CollectionScreen, CollectionDetailScreen, ProgressUi ve progress.css bulunur. App route sayfaları bileşimi yapar. GameScreen başka feature içe aktarmadan tamamlanmada sonuç URL'sine yönlenir. Koleksiyon cache'i oyun bitiminde yenilenir. Query anahtarlarında kullanıcı, filtre ve sayfa parametreleri kullanılır; hesap değişiminde mevcut provider cache temizliği sürer. Sayaçlar, XP ve açılan parçalar backend'den gelir; oyun sonucu ve kişisel koleksiyonun parça kaynakları ayrıdır. Gerçek HTTP doğrulaması scripts/smoke-progress.mjs ile salt okunur olarak yapılır.

## Canlı bağlantı

Shared transport yalnız protokol/bağlantı yaşam döngüsünü bilir. App RealtimeProvider feature API'lerini kullanarak yetkili REST snapshot'larını ve Query cache'ini eşitler. Feature'lar ortak RealtimeContext üzerinden polling aralığını seçer. Vitest UI fixture'larında VITE_ENABLE_REALTIME=false; transport sahte socket ile ayrıca sınanır. Gerçek Node 24 WebSocket/REST smoke script'i uygulamanın aynı transport ve API şemalarını kullanır; browser UI E2E yerine geçmez.
