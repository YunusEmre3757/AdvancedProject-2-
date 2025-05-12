-- Ürün renkleri tablosu
CREATE TABLE IF NOT EXISTS product_colors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    color_name VARCHAR(50) NOT NULL,
    color_code VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_color (color_name)
);

-- Yaygın renkleri ekleyelim
INSERT INTO product_colors (color_name, color_code) VALUES 
('Siyah', '#000000'),
('Beyaz', '#FFFFFF'),
('Kırmızı', '#FF0000'),
('Mavi', '#0000FF'),
('Yeşil', '#00FF00'),
('Sarı', '#FFFF00'),
('Turuncu', '#FFA500'),
('Mor', '#800080'),
('Pembe', '#FFC0CB'),
('Gri', '#808080'),
('Kahverengi', '#A52A2A'),
('Lacivert', '#000080'),
('Turkuaz', '#40E0D0'),
('Altın', '#FFD700'),
('Gümüş', '#C0C0C0');
