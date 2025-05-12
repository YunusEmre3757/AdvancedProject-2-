# Ürün ve Varyant API Test Kılavuzu

Bu belge, ürün ve varyant işlevlerinin test edilmesi için adımları içerir.

## Test Veri Yükleme

Uygulamayı başlattıktan sonra, test verileri yüklemek için aşağıdaki API çağrısını yapın:

```
POST /api/test/load-data
```

Bu işlem, veritabanına test kategorileri, markalar, ürünler, ürün özellikleri ve varyantları yükleyecektir.

## Test API Endpoint'leri

### Ürünleri Listeleme

```
GET /api/test/products
```

Parametreler:
- `page`: Sayfa numarası (varsayılan: 0)
- `size`: Sayfa boyutu (varsayılan: 10)
- `sort`: Sıralama (örn: "name,asc")
- `category`: Kategori filtresi (ID veya slug)
- `search`: Arama terimi
- `brand`: Marka filtresi (ID veya slug)

### Ürün Özelliklerini Listeleme

```
GET /api/test/product/{productId}/attributes
```

### Ürün Varyantlarını Listeleme

```
GET /api/test/product/{productId}/variants
```

### Özellik Seçimine Göre Varyant Bulma

```
GET /api/test/product/{productId}/variant-by-attributes?color=Siyah&storage=128 GB
```

Parametreler:
- `color`: Renk değeri 
- `storage`: Depolama değeri

### Yeni Varyant Ekleme

```
POST /api/test/product/{productId}/variants
```

Bu endpoint, iPhone 14 Pro için Yeşil renkli 128 GB bir varyant ekler.

### Varyant Güncelleme

```
PUT /api/test/variants/{variantId}
```

Bu endpoint, belirtilen varyantın stok miktarını 10 arttırır ve fiyatını %5 düşürür.

### Varyant Silme

```
DELETE /api/test/variants/{variantId}
```

### Yeni Özellik Ekleme

```
POST /api/test/product/{productId}/attributes
```

Bu endpoint, ürüne "Garanti" adında yeni bir özellik ekler.

### Özellik Değeri Ekleme

```
POST /api/test/attributes/{attributeId}/values
```

Bu endpoint, belirtilen özelliğe "24 Ay" değerini ekler.

## Test Adımları

1. Önce test verileri yükleyin.
2. Ürünleri listeleyin ve farklı filtreleme seçeneklerini test edin.
3. iPhone 14 Pro ürününün (ID: 1) özelliklerini ve varyantlarını listeleyin.
4. Özellik seçimi yaparak bir varyant arayın (örn: Siyah renk, 128 GB depolama için).
5. iPhone 14 Pro'ya yeni bir varyant ekleyin.
6. Var olan bir varyantı güncelleyin.
7. Eklediğiniz varyantı silin.
8. Bir ürüne yeni özellik ve değer ekleyin.

## Test Verileri

Test verileri, aşağıdaki ana öğeleri içerir:

1. **Kategoriler**: Elektronik, Bilgisayarlar, Telefonlar, Giyim vs.
2. **Markalar**: Apple, Samsung, Asus, Nike, Adidas
3. **Ürünler**:
   - iPhone 14 Pro
   - Samsung Galaxy S23
   - MacBook Pro 16
   - Asus ROG Strix G15
   - Nike Air Force 1
4. **Ürün Özellikleri ve Değerleri**:
   - Telefon özellikleri: Renk (Siyah, Beyaz, Mor), Depolama (128GB, 256GB, 512GB, 1TB)
   - Laptop özellikleri: İşlemci, RAM, Depolama
   - Ayakkabı özellikleri: Renk, Beden
5. **Varyantlar**: Her ürün için özellik kombinasyonlarına göre varyantlar 