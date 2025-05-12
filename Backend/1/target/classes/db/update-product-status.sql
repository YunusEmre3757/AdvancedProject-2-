-- status sütununu güncelle - tüm ürünleri active yap
UPDATE products SET status = 'active' WHERE status IS NULL;

-- Store status'u rejected olan mağazaların ürünlerini 'inactive' olarak işaretleyelim
UPDATE products p 
JOIN stores s ON p.store_id = s.id
SET p.status = 'inactive'
WHERE s.status = 'rejected'; 