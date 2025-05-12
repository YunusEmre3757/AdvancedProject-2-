package com.example.backend.service.impl;

import com.example.backend.dto.order.CreateOrderRequest;
import com.example.backend.dto.order.OrderDto;
import com.example.backend.dto.order.OrderItemDto;
import com.example.backend.dto.payment.RefundRequestDto;
import com.example.backend.dto.payment.RefundResponseDto;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.model.Order;
import com.example.backend.model.OrderItem;
import com.example.backend.model.Product;
import com.example.backend.model.ProductVariant;
import com.example.backend.model.Store;
import com.example.backend.model.User;
import com.example.backend.repository.OrderItemRepository;
import com.example.backend.repository.OrderRepository;
import com.example.backend.repository.ProductRepository;
import com.example.backend.repository.ProductVariantRepository;
import com.example.backend.repository.StoreRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.service.OrderService;
import com.example.backend.service.PaymentService;
import com.stripe.exception.StripeException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    private static final Logger logger = LoggerFactory.getLogger(OrderServiceImpl.class);

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final StoreRepository storeRepository;
    private final PaymentService paymentService;
    private final Random random = new Random();

    /**
     * Benzersiz bir sipariş numarası oluşturur.
     * Format: ORD-YYYYMMDDHHmmss-XXXX (XXXX: 4 haneli rastgele sayı)
     */
    private String generateOrderNumber() {
        LocalDateTime now = LocalDateTime.now();
        String timestamp = now.format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        int randomNum = random.nextInt(10000);
        String randomPart = String.format("%04d", randomNum); // 4 haneli sayı, başında sıfırlar ile
        return "ORD-" + timestamp + "-" + randomPart;
    }

    @Override
    @Transactional
    public OrderDto createOrder(Long userId, CreateOrderRequest request) {
        logger.info("Sipariş oluşturma isteği alındı. UserID: {}, Ürün sayısı: {}", userId, request.getItems().size());
        
        try {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı"));
            logger.info("Kullanıcı bulundu: {}", user.getEmail());

            // Stok kontrolü
            for (var itemRequest : request.getItems()) {
                // Varyant ID varsa önce varyantı kontrol et
                if (itemRequest.getVariantId() != null) {
                    logger.info("Varyant kontrolü yapılıyor. VaryantID: {}", itemRequest.getVariantId());
                    
                    ProductVariant variant = productVariantRepository.findById(itemRequest.getVariantId())
                        .orElseThrow(() -> new ResourceNotFoundException("Ürün varyantı bulunamadı: " + itemRequest.getVariantId()));
                    
                    logger.info("Varyant stok kontrolü: Varyant: {}, İstenilen: {}, Stokta: {}", 
                        variant.getSku(), itemRequest.getQuantity(), variant.getStockQuantity());
                    
                    if (variant.getStockQuantity() < itemRequest.getQuantity()) {
                        throw new IllegalStateException(
                            "Yetersiz varyant stoğu: " + variant.getSku() + 
                            " için " + itemRequest.getQuantity() + 
                            " adet istendi, stokta " + variant.getStockQuantity() + " adet var."
                        );
                    }
                    
                    // Stok yeterli, ana ürün kontrolüne devam et
                    logger.info("Varyant stoğu yeterli. Ana ürün kontrol ediliyor.");
                } 
                
                logger.info("Ürün kontrolü yapılıyor. ProductID: {}", itemRequest.getProductId());
                Product product = productRepository.findById(itemRequest.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Ürün bulunamadı: " + itemRequest.getProductId()));
                
                // Varyant yoksa ana ürün stoğunu kontrol et
                if (itemRequest.getVariantId() == null) {
                    logger.info("Stok kontrolü: Ürün: {}, İstenilen: {}, Stokta: {}", 
                        product.getName(), itemRequest.getQuantity(), product.getStock());
                    
                    if (product.getStock() < itemRequest.getQuantity()) {
                        throw new IllegalStateException(
                            "Yetersiz stok: " + product.getName() + 
                            " için " + itemRequest.getQuantity() + 
                            " adet istendi, stokta " + product.getStock() + " adet var."
                        );
                    }
                }
            }

            Order order = new Order();
            order.setUser(user);
            order.setDate(LocalDateTime.now());
            order.setTotalPrice(request.getTotalPrice());
            order.setStatus(request.getStatus() != null ? request.getStatus() : "PENDING");
            order.setAddress(request.getAddress());
            order.setItems(new ArrayList<>());
            
            // Benzersiz sipariş numarası oluştur ve set et
            String orderNumber = generateOrderNumber();
            order.setOrderNumber(orderNumber);
            logger.info("Sipariş numarası oluşturuldu: {}", orderNumber);
            
            // Ödeme bilgileri varsa ekle
            if (request.getPaymentIntentId() != null) {
                order.setPaymentIntentId(request.getPaymentIntentId());
                order.setPaymentStatus("PAID"); // Default to PAID if payment intent exists
                logger.info("Ödeme bilgileri eklendi. PaymentIntentId: {}", request.getPaymentIntentId());
            } else {
                order.setPaymentStatus("PENDING");
            }
            
            if (request.getPaymentMethod() != null) {
                order.setPaymentMethod(request.getPaymentMethod());
            }

            // Oluşturma ve güncelleme tarihlerini set et
            LocalDateTime now = LocalDateTime.now();
            order.setCreatedAt(now);
            order.setUpdatedAt(now);

            try {
                // Önce siparişi kaydet
                logger.info("Sipariş kaydediliyor...");
                Order savedOrder = orderRepository.save(order);
                logger.info("Sipariş başarıyla kaydedildi, ID: {}, Sipariş No: {}", savedOrder.getId(), savedOrder.getOrderNumber());

                // Sipariş öğelerini oluştur ve kaydet
                List<OrderItem> orderItems = new ArrayList<>();
                
                for (var itemRequest : request.getItems()) {
                    OrderItem orderItem = new OrderItem();
                    orderItem.setOrder(savedOrder);
                    orderItem.setProductId(itemRequest.getProductId());
                    orderItem.setProductName(itemRequest.getProductName());
                    orderItem.setPrice(itemRequest.getPrice());
                    orderItem.setQuantity(itemRequest.getQuantity());
                    orderItem.setImage(itemRequest.getImage());
                    // Siparişin her öğesi için status PENDING olarak ayarla
                    orderItem.setStatus("PENDING");
                    
                    // Varyant ID varsa kaydet ve varyant stoğunu güncelle
                    if (itemRequest.getVariantId() != null) {
                        orderItem.setVariantId(itemRequest.getVariantId());
                        logger.info("Sipariş öğesine varyant ID eklendi: {}", itemRequest.getVariantId());
                        
                        // Varyant stoğunu güncelle
                        ProductVariant variant = productVariantRepository.findById(itemRequest.getVariantId())
                            .orElseThrow(() -> new ResourceNotFoundException("Ürün varyantı bulunamadı: " + itemRequest.getVariantId()));
                        
                        int oldVariantStock = variant.getStockQuantity();
                        int newVariantStock = oldVariantStock - itemRequest.getQuantity();
                        variant.setStockQuantity(newVariantStock);
                        
                        productVariantRepository.save(variant);
                        logger.info("Varyant stoğu güncellendi: {} -> {}", oldVariantStock, newVariantStock);
                        
                        // Ana ürün stoğunu da güncelle
                        Product product = productRepository.findById(itemRequest.getProductId())
                            .orElseThrow(() -> new ResourceNotFoundException("Ürün bulunamadı: " + itemRequest.getProductId()));
                        
                        // Ana ürünün stoğunu da azalt
                        int oldProductStock = product.getStock();
                        int newProductStock = oldProductStock - itemRequest.getQuantity();
                        product.setStock(newProductStock);
                        
                        // Eğer ürün stoktan tamamen tükendiyse, mağazanın aktif ürün sayısını azalt
                        if (oldProductStock > 0 && newProductStock == 0 && product.getStore() != null) {
                            Store store = product.getStore();
                            store.decrementActiveProductsCount();
                        }
                        
                        productRepository.save(product);
                        logger.info("Ana ürün stoğu da güncellendi: {} -> {}", oldProductStock, newProductStock);
                        
                        if (product.getStore() != null) {
                            orderItem.setStoreId(product.getStore().getId());
                            orderItem.setStoreName(product.getStore().getName());
                        }
                    }
                    // Varyant yoksa, sadece ana ürün stoğunu güncelle
                    else {
                        // Stok güncelleme
                        Product product = productRepository.findById(itemRequest.getProductId())
                            .orElseThrow(() -> new ResourceNotFoundException("Ürün bulunamadı: " + itemRequest.getProductId()));
                        
                        // Mağaza bilgilerini ekle
                        if (product.getStore() != null) {
                            orderItem.setStoreId(product.getStore().getId());
                            orderItem.setStoreName(product.getStore().getName());
                        }
                        
                        int oldStock = product.getStock();
                        int newStock = oldStock - itemRequest.getQuantity();
                        product.setStock(newStock);
                        
                        // Eğer ürün stoktan tamamen tükendiyse, mağazanın aktif ürün sayısını azalt
                        if (oldStock > 0 && newStock == 0 && product.getStore() != null) {
                            Store store = product.getStore();
                            store.decrementActiveProductsCount();
                        }
                        
                        productRepository.save(product);
                        logger.info("Ürün stoğu güncellendi: {} -> {}", oldStock, newStock);
                    }
                    
                    orderItems.add(orderItem);
                    logger.info("Sipariş öğesi oluşturuldu: ProductID: {}, VaryantID: {}, Miktar: {}", 
                        itemRequest.getProductId(), itemRequest.getVariantId(), itemRequest.getQuantity());
                }

                logger.info("Toplam {} sipariş öğesi kaydediliyor...", orderItems.size());
                List<OrderItem> savedItems = orderItemRepository.saveAll(orderItems);
                logger.info("{} sipariş öğesi başarıyla kaydedildi, Sipariş ID: {}", savedItems.size(), savedOrder.getId());
                
                savedOrder.setItems(savedItems);
                return mapToOrderDto(savedOrder);
                
            } catch (Exception e) {
                logger.error("Sipariş veritabanına kaydedilirken hata oluştu: {}", e.getMessage(), e);
                throw new RuntimeException("Sipariş oluşturulurken hata oluştu: " + e.getMessage(), e);
            }
        } catch (Exception e) {
            logger.error("Sipariş işleminde beklenmeyen hata: {}", e.getMessage(), e);
            throw new RuntimeException("Sipariş işleminde beklenmeyen hata: " + e.getMessage(), e);
        }
    }

    @Override
    public OrderDto getOrderById(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sipariş bulunamadı"));
        return mapToOrderDto(order);
    }

    @Override
    public List<OrderDto> getUserOrders(Long userId) {
        List<Order> orders = orderRepository.findByUserIdOrderByDateDesc(userId);
        return orders.stream()
                .map(this::mapToOrderDto)
                .collect(Collectors.toList());
    }
    
    @Override
    public List<OrderDto> getStoreOrders(Long storeId) {
        // Mağazaya ait siparişleri bul (sipariş öğeleri aracılığıyla)
        List<OrderItem> orderItems = orderItemRepository.findByStoreId(storeId);
        
        // Siparişleri grupla (bir sipariş birden fazla mağazadan ürün içerebilir)
        Map<Long, Order> orderMap = orderItems.stream()
            .map(OrderItem::getOrder)
            .distinct()
            .collect(Collectors.toMap(Order::getId, order -> order));
        
        // Sadece mağazaya ait ürünlerin siparişlerini dönüştür
        return orderMap.values().stream()
            .map(order -> {
                OrderDto dto = mapToOrderDto(order);
                // Yalnızca ilgili mağazaya ait sipariş öğelerini filtrele
                List<OrderItemDto> filteredItems = dto.getItems().stream()
                    .filter(item -> storeId.equals(item.getStoreId()))
                    .collect(Collectors.toList());
                dto.setItems(filteredItems);
                return dto;
            })
            .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public OrderDto cancelOrder(Long orderId, Long userId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Sipariş bulunamadı"));
        
        // Sipariş sahibini kontrol et
        if (!order.getUser().getId().equals(userId)) {
            throw new IllegalStateException("Bu siparişi iptal etme yetkiniz yok");
        }
        
        logger.info("Sipariş iptal isteği alındı. Sipariş ID: {}, Durum: {}", orderId, order.getStatus());
        
        // Sadece belirli durumlardaki siparişler iptal edilebilir
        if (!"PENDING".equals(order.getStatus()) && !"PROCESSING".equals(order.getStatus())) {
            throw new IllegalStateException("Sadece bekleyen veya işleme alınan siparişler iptal edilebilir");
        }
        
        // İptal edildiğinde stokları geri ekle
        for (OrderItem item : order.getItems()) {
            // Her bir sipariş öğesinin durumunu CANCELLED olarak ayarla
            item.setStatus("CANCELLED");
            
            // Varyant kontrolü
            if (item.getVariantId() != null) {
                logger.info("İptal edilen siparişte varyant bulundu. VariantID: {}", item.getVariantId());
                
                try {
                    // Varyant stoğunu geri ekle
                    ProductVariant variant = productVariantRepository.findById(item.getVariantId())
                        .orElseThrow(() -> new ResourceNotFoundException("Ürün varyantı bulunamadı: " + item.getVariantId()));
                    
                    int oldVariantStock = variant.getStockQuantity();
                    int newVariantStock = oldVariantStock + item.getQuantity();
                    variant.setStockQuantity(newVariantStock);
                    
                    productVariantRepository.save(variant);
                    logger.info("Varyant stoğu geri eklendi: {} -> {}", oldVariantStock, newVariantStock);
                } catch (Exception e) {
                    logger.error("Varyant stoğu geri eklenirken hata oluştu. VariantID: {}, Hata: {}", 
                                 item.getVariantId(), e.getMessage());
                }
            }
            
            // Ana ürün stoğunu her durumda geri ekle
            try {
                Product product = productRepository.findById(item.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Ürün bulunamadı: " + item.getProductId()));
                
                int oldStock = product.getStock();
                int newStock = oldStock + item.getQuantity();
                product.setStock(newStock);
                
                // Eğer ürün stoğu sıfırdan yeniden aktifleştiyse, mağazanın aktif ürün sayısını artır
                if (oldStock == 0 && newStock > 0 && product.getStore() != null) {
                    Store store = product.getStore();
                    store.incrementActiveProductsCount();
                    logger.info("Mağaza aktif ürün sayısı artırıldı. StoreID: {}", store.getId());
                }
                
                productRepository.save(product);
                logger.info("Ürün stoğu geri eklendi: ProductID: {}, {} -> {}", item.getProductId(), oldStock, newStock);
            } catch (Exception e) {
                logger.error("Ürün stoğu geri eklenirken hata oluştu. ProductID: {}, Hata: {}", 
                             item.getProductId(), e.getMessage());
            }
        }
        
        // Ödeme iadesi varsa işlemleri yap
        if (order.getPaymentIntentId() != null) {
            try {
                // Miktarı kuruşa çevir (TL -> kuruş)
                long amountInCents = order.getTotalPrice().multiply(new BigDecimal("100")).longValue();
                
                RefundRequestDto refundRequest = new RefundRequestDto();
                refundRequest.setPaymentIntentId(order.getPaymentIntentId());
                refundRequest.setAmount(amountInCents);
                refundRequest.setReason("requested_by_customer");
                
                RefundResponseDto refundResponse = paymentService.refundPayment(refundRequest);
                
                // İade bilgilerini güncelle
                order.setRefundId(refundResponse.getRefundId());
                order.setRefundStatus(refundResponse.getStatus());
                order.setRefundAmount(new BigDecimal(refundResponse.getAmount()).divide(new BigDecimal("100"))); // Kuruş -> TL
                
                // Ödeme durumunu güncelle
                if ("succeeded".equalsIgnoreCase(refundResponse.getStatus())) {
                    order.setPaymentStatus("REFUNDED");
                }
                
                logger.info("Sipariş iadesi başarılı. Sipariş: {}, İade ID: {}", orderId, refundResponse.getRefundId());
            } catch (StripeException e) {
                // İade başarısız olsa bile siparişi iptal edelim, ama hatayı loglayalım
                logger.error("Sipariş iptal edildi ancak ödeme iadesi başarısız oldu. Sipariş ID: " + orderId, e);
                order.setRefundStatus("FAILED");
                order.setPaymentStatus("FAILED");
            }
        }
        
        // Sipariş durumunu güncelle
        order.setStatus("CANCELLED");
        order.setCancelledAt(LocalDateTime.now());
        
        Order savedOrder = orderRepository.save(order);
        logger.info("Sipariş başarıyla iptal edildi. Sipariş ID: {}", orderId);
        
        return mapToOrderDto(savedOrder);
    }

    @Override
    @Transactional
    public OrderDto updateOrderStatus(Long orderId, String status) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Sipariş bulunamadı"));
        
        String oldStatus = order.getStatus();
        logger.info("Sipariş durumu güncelleme isteği. Sipariş ID: {}, Eski Durum: {}, Yeni Durum: {}", 
                   orderId, oldStatus, status);
        
        // Eğer sipariş iptal ediliyorsa (CANCELLED) ve daha önce iptal edilmemişse
        if ("CANCELLED".equals(status) && !"CANCELLED".equals(oldStatus)) {
            // Sadece belirli durumlardaki siparişler iptal edilebilir (Admin için daha geniş yetki)
            if (!"PENDING".equals(oldStatus) && !"PROCESSING".equals(oldStatus) && !"SHIPPING".equals(oldStatus)) {
                throw new IllegalStateException("Admin sadece bekleyen, işleme alınan veya kargoya verilen siparişleri iptal edebilir");
            }
            
            // Stok iadesi yapılsın
            for (OrderItem item : order.getItems()) {
                // Her bir sipariş öğesinin durumunu CANCELLED olarak ayarla
                item.setStatus("CANCELLED");
                
                // Varyant kontrolü
                if (item.getVariantId() != null) {
                    logger.info("İptal edilen siparişte varyant bulundu. VariantID: {}", item.getVariantId());
                    
                    try {
                        // Varyant stoğunu geri ekle
                        ProductVariant variant = productVariantRepository.findById(item.getVariantId())
                            .orElseThrow(() -> new ResourceNotFoundException("Ürün varyantı bulunamadı: " + item.getVariantId()));
                        
                        int oldVariantStock = variant.getStockQuantity();
                        int newVariantStock = oldVariantStock + item.getQuantity();
                        variant.setStockQuantity(newVariantStock);
                        
                        productVariantRepository.save(variant);
                        logger.info("Varyant stoğu geri eklendi: {} -> {}", oldVariantStock, newVariantStock);
                    } catch (Exception e) {
                        logger.error("Varyant stoğu geri eklenirken hata oluştu. VariantID: {}, Hata: {}", 
                                    item.getVariantId(), e.getMessage());
                    }
                }
                
                // Ana ürün stoğunu her durumda geri ekle
                try {
                    Product product = productRepository.findById(item.getProductId())
                        .orElseThrow(() -> new ResourceNotFoundException("Ürün bulunamadı: " + item.getProductId()));
                    
                    int oldStock = product.getStock();
                    int newStock = oldStock + item.getQuantity();
                    product.setStock(newStock);
                    
                    // Eğer ürün stoğu sıfırdan yeniden aktifleştiyse, mağazanın aktif ürün sayısını artır
                    if (oldStock == 0 && newStock > 0 && product.getStore() != null) {
                        Store store = product.getStore();
                        store.incrementActiveProductsCount();
                        logger.info("Mağaza aktif ürün sayısı artırıldı. StoreID: {}", store.getId());
                    }
                    
                    productRepository.save(product);
                    logger.info("Ürün stoğu geri eklendi: ProductID: {}, {} -> {}", item.getProductId(), oldStock, newStock);
                } catch (Exception e) {
                    logger.error("Ürün stoğu geri eklenirken hata oluştu. ProductID: {}, Hata: {}", 
                                item.getProductId(), e.getMessage());
                }
            }
            
            // Ödeme iadesi varsa işlemleri yap
            if (order.getPaymentIntentId() != null && !"REFUNDED".equals(order.getRefundStatus())) {
                try {
                    // Miktarı kuruşa çevir (TL -> kuruş)
                    long amountInCents = order.getTotalPrice().multiply(new BigDecimal("100")).longValue();
                    
                    RefundRequestDto refundRequest = new RefundRequestDto();
                    refundRequest.setPaymentIntentId(order.getPaymentIntentId());
                    refundRequest.setAmount(amountInCents);
                    refundRequest.setReason("requested_by_customer");
                    
                    RefundResponseDto refundResponse = paymentService.refundPayment(refundRequest);
                    
                    // İade bilgilerini güncelle
                    order.setRefundId(refundResponse.getRefundId());
                    order.setRefundStatus(refundResponse.getStatus());
                    order.setRefundAmount(new BigDecimal(refundResponse.getAmount()).divide(new BigDecimal("100"))); // Kuruş -> TL
                    
                    // Ödeme durumunu güncelle
                    if ("succeeded".equalsIgnoreCase(refundResponse.getStatus())) {
                        order.setPaymentStatus("REFUNDED");
                    }
                    
                    logger.info("Admin tarafından sipariş iadesi başarılı. Sipariş: {}, İade ID: {}", orderId, refundResponse.getRefundId());
                } catch (StripeException e) {
                    // İade başarısız olsa bile siparişi iptal edelim, ama hatayı loglayalım
                    logger.error("Sipariş admin tarafından iptal edildi ancak ödeme iadesi başarısız oldu. Sipariş ID: " + orderId, e);
                    order.setRefundStatus("FAILED");
                    order.setPaymentStatus("FAILED");
                }
            }
            
            // İptal tarihini ayarla
            order.setCancelledAt(LocalDateTime.now());
        }
        else {
            // İptal durumu değilse, iptal edilmemiş sipariş öğelerinin durumlarını güncelle
            for (OrderItem item : order.getItems()) {
                // İptal edilmiş öğelerin durumunu değiştirme
                if ("CANCELLED".equals(item.getStatus())) {
                    logger.info("İptal edilmiş sipariş öğesi atlanıyor. ItemID: {}", item.getId());
                    continue;
                }
                item.setStatus(status);
                logger.info("Sipariş öğesi durumu güncellendi. ItemID: {}, Durum: {}", item.getId(), status);
            }
        }
        
        order.setStatus(status);
        Order savedOrder = orderRepository.save(order);
        logger.info("Sipariş durumu başarıyla güncellendi. Sipariş ID: {}, Durum: {}", orderId, status);
        
        return mapToOrderDto(savedOrder);
    }
    
    @Override
    @Transactional
    public OrderDto updateOrderStatusByStore(Long orderId, Long storeId, String status) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Sipariş bulunamadı"));
        
        // Mağazanın bu siparişteki öğelerini kontrol et
        boolean hasStoreItems = order.getItems().stream()
                .anyMatch(item -> storeId.equals(item.getStoreId()));
        
        if (!hasStoreItems) {
            throw new IllegalStateException("Bu sipariş bu mağazaya ait ürünler içermiyor");
        }
        
        String oldStatus = order.getStatus();
        logger.info("Mağaza tarafından sipariş durumu güncelleme isteği. Sipariş ID: {}, Mağaza ID: {}, Eski Durum: {}, Yeni Durum: {}", 
                   orderId, storeId, oldStatus, status);
        
        // Eğer sipariş iptal ediliyorsa (CANCELLED) ve daha önce iptal edilmemişse
        if ("CANCELLED".equals(status) && !"CANCELLED".equals(oldStatus)) {
            // Sadece belirli durumlardaki siparişler iptal edilebilir
            if (!"PENDING".equals(oldStatus) && !"PROCESSING".equals(oldStatus)) {
                throw new IllegalStateException("Mağaza sadece bekleyen veya işleme alınan siparişleri iptal edebilir");
            }
            
            // Sadece bu mağazaya ait ürünlerin stoklarını geri ekle ve durumlarını güncelle
            for (OrderItem item : order.getItems()) {
                if (storeId.equals(item.getStoreId())) {
                    // Varyant kontrolü
                    if (item.getVariantId() != null) {
                        logger.info("İptal edilen mağaza siparişinde varyant bulundu. VariantID: {}", item.getVariantId());
                        
                        try {
                            // Varyant stoğunu geri ekle
                            ProductVariant variant = productVariantRepository.findById(item.getVariantId())
                                .orElseThrow(() -> new ResourceNotFoundException("Ürün varyantı bulunamadı: " + item.getVariantId()));
                            
                            int oldVariantStock = variant.getStockQuantity();
                            int newVariantStock = oldVariantStock + item.getQuantity();
                            variant.setStockQuantity(newVariantStock);
                            
                            productVariantRepository.save(variant);
                            logger.info("Varyant stoğu geri eklendi: {} -> {}", oldVariantStock, newVariantStock);
                        } catch (Exception e) {
                            logger.error("Varyant stoğu geri eklenirken hata oluştu. VariantID: {}, Hata: {}", 
                                        item.getVariantId(), e.getMessage());
                        }
                    }
                    
                    // Ana ürün stoğunu her durumda geri ekle
                    try {
                        Product product = productRepository.findById(item.getProductId())
                            .orElseThrow(() -> new ResourceNotFoundException("Ürün bulunamadı: " + item.getProductId()));
                        
                        int oldStock = product.getStock();
                        int newStock = oldStock + item.getQuantity();
                        product.setStock(newStock);
                        
                        // Eğer ürün stoğu sıfırdan yeniden aktifleştiyse, mağazanın aktif ürün sayısını artır
                        if (oldStock == 0 && newStock > 0 && product.getStore() != null) {
                            Store store = product.getStore();
                            store.incrementActiveProductsCount();
                            logger.info("Mağaza aktif ürün sayısı artırıldı. StoreID: {}", store.getId());
                        }
                        
                        productRepository.save(product);
                        logger.info("Ürün stoğu geri eklendi: ProductID: {}, {} -> {}", item.getProductId(), oldStock, newStock);
                    } catch (Exception e) {
                        logger.error("Ürün stoğu geri eklenirken hata oluştu. ProductID: {}, Hata: {}", 
                                    item.getProductId(), e.getMessage());
                    }
                    
                    // Sipariş öğesinin durumunu güncelle
                    item.setStatus(status);
                }
            }
            
            // Mağaza kaynaklı iptal için ödeme iadesi
            // Not: Burada mağazaya özgü ürünlerin toplam tutarını hesaplayıp kısmi iade de yapılabilir
            if (order.getPaymentIntentId() != null && !"REFUNDED".equals(order.getRefundStatus())) {
                try {
                    // Miktarı kuruşa çevir (TL -> kuruş)
                    long amountInCents = order.getTotalPrice().multiply(new BigDecimal("100")).longValue();
                    
                    RefundRequestDto refundRequest = new RefundRequestDto();
                    refundRequest.setPaymentIntentId(order.getPaymentIntentId());
                    refundRequest.setAmount(amountInCents);
                    refundRequest.setReason("requested_by_customer");
                    
                    RefundResponseDto refundResponse = paymentService.refundPayment(refundRequest);
                    
                    // İade bilgilerini güncelle
                    order.setRefundId(refundResponse.getRefundId());
                    order.setRefundStatus(refundResponse.getStatus());
                    order.setRefundAmount(new BigDecimal(refundResponse.getAmount()).divide(new BigDecimal("100"))); // Kuruş -> TL
                    
                    // Ödeme durumunu güncelle
                    if ("succeeded".equalsIgnoreCase(refundResponse.getStatus())) {
                        order.setPaymentStatus("REFUNDED");
                    }
                    
                    logger.info("Mağaza tarafından sipariş iadesi başarılı. Sipariş: {}, Mağaza: {}, İade ID: {}", 
                               orderId, storeId, refundResponse.getRefundId());
                } catch (StripeException e) {
                    // İade başarısız olsa bile siparişi iptal edelim, ama hatayı loglayalım
                    logger.error("Sipariş mağaza tarafından iptal edildi ancak ödeme iadesi başarısız oldu. " +
                               "Sipariş ID: " + orderId + ", Mağaza ID: " + storeId, e);
                    order.setRefundStatus("FAILED");
                    order.setPaymentStatus("FAILED");
                }
            }
            
            // İptal tarihini ayarla
            order.setCancelledAt(LocalDateTime.now());
        } else if ("SHIPPING".equals(status) || "DELIVERED".equals(status) || "PROCESSING".equals(status)) {
            // Satıcı sadece kendi ürünlerinin durumunu güncelleyebilir
            for (OrderItem item : order.getItems()) {
                if (storeId.equals(item.getStoreId())) {
                    // İptal edilmiş öğelerin durumunu değiştirme
                    if ("CANCELLED".equals(item.getStatus())) {
                        logger.info("İptal edilmiş sipariş öğesi atlanıyor. Mağaza: {}, ItemID: {}", storeId, item.getId());
                        continue;
                    }
                    item.setStatus(status);
                    logger.info("Mağaza tarafından sipariş öğesi durumu güncellendi. Mağaza: {}, ItemID: {}, Durum: {}", 
                                storeId, item.getId(), status);
                }
            }
            
            // Ana sipariş durumunu kontrol et ve uygun şekilde güncelle
            updateOrderStatusBasedOnItems(order);
        }
        
        Order savedOrder = orderRepository.save(order);
        logger.info("Mağaza tarafından sipariş durumu başarıyla güncellendi. Sipariş ID: {}, Mağaza ID: {}, Durum: {}", 
                  orderId, storeId, status);
        
        return mapToOrderDto(savedOrder);
    }

   

    @Override
    @Transactional
    public OrderDto updateOrderItemTrackingNumber(Long orderId, Long itemId, String trackingNumber) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Sipariş bulunamadı"));
                
        OrderItem itemToUpdate = order.getItems().stream()
                .filter(item -> item.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Sipariş öğesi bulunamadı"));
                
        // Takip numarasını ayarla
        itemToUpdate.setTrackingNumber(trackingNumber);
        
        // Sadece iptal edilmemiş öğelerin durumunu güncelle
        if (!"CANCELLED".equals(itemToUpdate.getStatus())) {
            itemToUpdate.setStatus("SHIPPING");
            logger.info("Sipariş öğesi takip numarası ve durumu güncellendi. OrderID: {}, ItemID: {}, Takip No: {}, Durum: SHIPPING", 
                       orderId, itemId, trackingNumber);
        } else {
            logger.info("İptal edilmiş sipariş öğesine takip numarası eklendi, durum değiştirilmedi. OrderID: {}, ItemID: {}, Takip No: {}", 
                       orderId, itemId, trackingNumber);
        }
        
        // Sipariş durumunu öğelere göre yeniden hesapla
        updateOrderStatusBasedOnItems(order);
                   
        return mapToOrderDto(orderRepository.save(order));
    }

    @Override
    public long getOrderCount() {
        return orderRepository.count();
    }
    
    @Override
    public int getOrderPercentageIncrease(int days) {
        LocalDateTime startDate = LocalDateTime.now().minusDays(days);
        LocalDateTime previousPeriodStart = startDate.minusDays(days);
        
        // Bu dönemdeki siparişler
        long currentPeriodOrders = orderRepository.countByDateAfter(startDate);
        
        // Önceki dönemdeki siparişler
        long previousPeriodOrders = orderRepository.countByDateAfterAndDateBefore(previousPeriodStart, startDate);
        
        // Eğer önceki dönemde sipariş yoksa, artış yüzdesini 100 olarak döndürüyoruz
        if (previousPeriodOrders == 0) {
            return currentPeriodOrders > 0 ? 100 : 0;
        }
        
        // Artış yüzdesini hesapla
        double percentageChange = ((double) currentPeriodOrders - previousPeriodOrders) / previousPeriodOrders * 100;
        
        return (int) Math.round(percentageChange);
    }

    @Override
    public List<OrderDto> getAllOrders() {
        List<Order> orders = orderRepository.findAll();
        return orders.stream()
                .map(this::mapToOrderDto)
                .collect(Collectors.toList());
    }
    
    @Override
    public List<OrderDto> getAllOrdersByStatus(String status) {
        List<Order> orders = orderRepository.findByStatus(status);
        return orders.stream()
                .map(this::mapToOrderDto)
                .collect(Collectors.toList());
    }
    
    @Override
    public List<OrderDto> searchOrders(String query) {
        Long orderId = null;
        try {
            orderId = Long.parseLong(query);
        } catch (NumberFormatException e) {
            // query bir sayı değil, bu durumda orderId ile aramayacağız
        }
        
        List<Order> orders = new ArrayList<>();
        
        if (orderId != null) {
            orderRepository.findById(orderId).ifPresent(orders::add);
        }
        
        List<Order> userOrders = orderRepository.findByUserNameContainingIgnoreCase(query);
        orders.addAll(userOrders);
        
        return orders.stream()
                .distinct()
                .map(this::mapToOrderDto)
                .collect(Collectors.toList());
    }
    
    @Override
    public List<OrderDto> searchOrdersWithStatus(String query, String status) {
        List<OrderDto> results = searchOrders(query);
        return results.stream()
                .filter(order -> order.getStatus().equals(status))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deleteOrder(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Sipariş bulunamadı: " + orderId));
        
        try {
            logger.info("Sipariş siliniyor. ID: {}", orderId);
            
            // Önce sipariş öğelerini sil
            orderItemRepository.deleteAll(order.getItems());
            
            // Sonra siparişi sil
            orderRepository.delete(order);
            
            logger.info("Sipariş başarıyla silindi. ID: {}", orderId);
        } catch (Exception e) {
            logger.error("Sipariş silinirken hata oluştu. ID: {}, Hata: {}", orderId, e.getMessage(), e);
            throw new RuntimeException("Sipariş silinirken hata oluştu: " + e.getMessage(), e);
        }
    }
    
    /**
     * Mağaza için belirli tarihler arasındaki sipariş sayısını hesaplar
     */
    @Override
    public int countStoreOrdersBetweenDates(Long storeId, LocalDateTime startDate, LocalDateTime endDate) {
        // Mağazaya ait siparişleri bul
        List<OrderItem> orderItems = orderItemRepository.findByStoreId(storeId);
        
        // Siparişleri tarih aralığına göre filtrele
        return (int) orderItems.stream()
            .map(OrderItem::getOrder)
            .distinct()
            .filter(order -> {
                LocalDateTime orderDate = order.getDate();
                return orderDate != null && 
                       !orderDate.isBefore(startDate) && 
                       !orderDate.isAfter(endDate);
            })
            .count();
    }
    
    /**
     * Mağaza için bekleyen sipariş sayısını hesaplar
     */
    @Override
    public int countStorePendingOrders(Long storeId) {
        // Mağazaya ait siparişleri bul
        List<OrderItem> orderItems = orderItemRepository.findByStoreId(storeId);
        
        // Bekleyen veya işlemdeki siparişleri filtrele
        return (int) orderItems.stream()
            .map(OrderItem::getOrder)
            .distinct()
            .filter(order -> "PENDING".equals(order.getStatus()) || 
                           "PROCESSING".equals(order.getStatus()))
            .count();
    }
    
    /**
     * Mağaza için belirli tarihler arasındaki toplam geliri hesaplar
     */
    @Override
    public double calculateStoreRevenueBetweenDates(Long storeId, LocalDateTime startDate, LocalDateTime endDate) {
        // Mağazaya ait siparişleri bul
        List<OrderItem> orderItems = orderItemRepository.findByStoreId(storeId);
        
        // Tarih aralığındaki siparişlerin toplam gelirini hesapla
        return orderItems.stream()
            .filter(item -> {
                Order order = item.getOrder();
                LocalDateTime orderDate = order.getDate();
                return orderDate != null && 
                       !orderDate.isBefore(startDate) && 
                       !orderDate.isAfter(endDate) &&
                       !"CANCELLED".equals(order.getStatus());
            })
            .mapToDouble(item -> item.getPrice().doubleValue() * item.getQuantity())
            .sum();
    }
    
    /**
     * Mağazanın toplam ürün sayısını getirir
     */
    @Override
    public int getStoreProductCount(Long storeId) {
        // Mağazanın sahip olduğu ürün sayısını hesapla
        return productRepository.countByStoreId(storeId);
    }

    

    @Override
    @Transactional
    public OrderDto updateOrderItemStatus(Long storeId, Long orderId, Long itemId, String status) {
        // Siparişi bul
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Sipariş bulunamadı: " + orderId));
        
        // Sipariş kalemi içinde belirtilen itemId ve storeId'ye sahip olanı bul
        OrderItem itemToUpdate = order.getItems().stream()
                .filter(item -> item.getId().equals(itemId) && storeId.equals(item.getStoreId()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Bu mağazaya ait sipariş öğesi bulunamadı"));
        
        // Status kontrolü - geçerli bir durum olmalı (PENDING, PROCESSING, SHIPPING, DELIVERED, CANCELLED)
        if (!isValidStatus(status)) {
            throw new IllegalArgumentException("Geçersiz sipariş durumu: " + status);
        }
        
        // Eğer öğe zaten iptal edilmişse ve yeni durum da iptal değilse, işlemi reddet
        if ("CANCELLED".equals(itemToUpdate.getStatus()) && !"CANCELLED".equals(status)) {
            logger.warn("İptal edilmiş bir sipariş öğesinin durumu değiştirilemez. OrderID: {}, ItemID: {}, İstenen Durum: {}", 
                      orderId, itemId, status);
            throw new IllegalStateException("İptal edilmiş bir sipariş öğesinin durumu değiştirilemez.");
        }
        
        logger.info("Sipariş öğesi durumu güncelleniyor. OrderID: {}, ItemID: {}, Eski Durum: {}, Yeni Durum: {}", 
                   orderId, itemId, itemToUpdate.getStatus(), status);
        
        // Eğer sipariş öğesi iptal ediliyorsa (CANCELLED) ve daha önce iptal edilmemişse
        if ("CANCELLED".equals(status) && !"CANCELLED".equals(itemToUpdate.getStatus())) {
            // Sadece belirli durumlardaki sipariş öğeleri iptal edilebilir
            if (!"PENDING".equals(itemToUpdate.getStatus()) && !"PROCESSING".equals(itemToUpdate.getStatus())) {
                throw new IllegalStateException("Sadece bekleyen veya işleme alınan sipariş öğeleri iptal edilebilir");
            }
            
            // İptal edilen ürünün toplam fiyatını hesapla ve sipariş toplam fiyatından çıkar
            BigDecimal cancelItemPrice = itemToUpdate.getPrice().multiply(BigDecimal.valueOf(itemToUpdate.getQuantity()));
            BigDecimal currentOrderTotal = order.getTotalPrice();
            BigDecimal updatedOrderTotal = currentOrderTotal.subtract(cancelItemPrice);
            order.setTotalPrice(updatedOrderTotal);
            logger.info("Sipariş toplam tutarı güncellendi. OrderID: {}, Eski Tutar: {}, İade Edilen: {}, Yeni Tutar: {}", 
                       orderId, currentOrderTotal, cancelItemPrice, updatedOrderTotal);
            
            // İptal edildiğinde stoku geri ekle
            // Varyant kontrolü
            if (itemToUpdate.getVariantId() != null) {
                logger.info("İptal edilen sipariş öğesinde varyant bulundu. VariantID: {}", itemToUpdate.getVariantId());
                
                try {
                    // Varyant stoğunu geri ekle
                    ProductVariant variant = productVariantRepository.findById(itemToUpdate.getVariantId())
                        .orElseThrow(() -> new ResourceNotFoundException("Ürün varyantı bulunamadı: " + itemToUpdate.getVariantId()));
                    
                    int oldVariantStock = variant.getStockQuantity();
                    int newVariantStock = oldVariantStock + itemToUpdate.getQuantity();
                    variant.setStockQuantity(newVariantStock);
                    
                    productVariantRepository.save(variant);
                    logger.info("Varyant stoğu geri eklendi: {} -> {}", oldVariantStock, newVariantStock);
                } catch (Exception e) {
                    logger.error("Varyant stoğu geri eklenirken hata oluştu. VariantID: {}, Hata: {}", 
                                itemToUpdate.getVariantId(), e.getMessage());
                }
            }
            
            // Ana ürün stoğunu her durumda geri ekle
            try {
                Product product = productRepository.findById(itemToUpdate.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Ürün bulunamadı: " + itemToUpdate.getProductId()));
                
                int oldStock = product.getStock();
                int newStock = oldStock + itemToUpdate.getQuantity();
                product.setStock(newStock);
                
                // Eğer ürün stoğu sıfırdan yeniden aktifleştiyse, mağazanın aktif ürün sayısını artır
                if (oldStock == 0 && newStock > 0 && product.getStore() != null) {
                    Store store = product.getStore();
                    store.incrementActiveProductsCount();
                    logger.info("Mağaza aktif ürün sayısı artırıldı. StoreID: {}", store.getId());
                }
                
                productRepository.save(product);
                logger.info("Ürün stoğu geri eklendi: ProductID: {}, {} -> {}", itemToUpdate.getProductId(), oldStock, newStock);
            } catch (Exception e) {
                logger.error("Ürün stoğu geri eklenirken hata oluştu. ProductID: {}, Hata: {}", 
                            itemToUpdate.getProductId(), e.getMessage());
            }
            
            // Kısmi ödeme iadesi için kontrol
            if (order.getPaymentIntentId() != null && !"REFUNDED".equals(order.getRefundStatus())) {
                try {
                    // Sadece iptal edilen sipariş öğesinin tutarını hesapla
                    BigDecimal itemTotalPrice = itemToUpdate.getPrice().multiply(BigDecimal.valueOf(itemToUpdate.getQuantity()));
                    
                    // Miktarı kuruşa çevir (TL -> kuruş)
                    long amountInCents = itemTotalPrice.multiply(new BigDecimal("100")).longValue();
                    
                    RefundRequestDto refundRequest = new RefundRequestDto();
                    refundRequest.setPaymentIntentId(order.getPaymentIntentId());
                    refundRequest.setAmount(amountInCents);
                    refundRequest.setReason("requested_by_customer");
                    
                    RefundResponseDto refundResponse = paymentService.refundPayment(refundRequest);
                    
                    // İade bilgilerini güncelle
                    // Eğer önceden kısmi iade yapıldıysa, önceki iade tutarı ile şimdiki iade tutarını topla
                    BigDecimal totalRefundAmount;
                    if (order.getRefundAmount() != null) {
                        totalRefundAmount = order.getRefundAmount().add(new BigDecimal(refundResponse.getAmount()).divide(new BigDecimal("100")));
                    } else {
                        totalRefundAmount = new BigDecimal(refundResponse.getAmount()).divide(new BigDecimal("100"));
                    }
                    
                    order.setRefundId(refundResponse.getRefundId());
                    order.setRefundStatus("PARTIALLY_REFUNDED");
                    order.setRefundAmount(totalRefundAmount);
                    
                    logger.info("Sipariş öğesi için kısmi iade yapıldı. Sipariş: {}, Öğe: {}, İade tutar: {}, İade ID: {}", 
                                orderId, itemId, itemTotalPrice, refundResponse.getRefundId());
                } catch (StripeException e) {
                    // İade başarısız olsa bile sipariş öğesini iptal edelim, ama hatayı loglayalım
                    logger.error("Sipariş öğesi iptal edildi ancak ödeme iadesi başarısız oldu. Sipariş ID: " + 
                                orderId + ", Öğe ID: " + itemId, e);
                }
            }
        }
        
        // Durumu güncelle
        itemToUpdate.setStatus(status);
        
        // Tüm sipariş öğelerinin durumunu kontrol et ve ana sipariş durumunu güncelle
        updateOrderStatusBasedOnItems(order);
        
        Order savedOrder = orderRepository.save(order);
        logger.info("Sipariş öğesi durumu başarıyla güncellendi. OrderID: {}, ItemID: {}, Durum: {}", 
                   orderId, itemId, status);
        
        return mapToOrderDto(savedOrder);
    }

    /**
     * Sipariş öğelerinin durumlarına göre ana sipariş durumunu günceller
     */
    private void updateOrderStatusBasedOnItems(Order order) {
        List<OrderItem> items = order.getItems();
        if (items == null || items.isEmpty()) {
            return;
        }
        
        // İptal edilmeyen (aktif) ürünleri say
        long activeItemsCount = items.stream()
                .filter(item -> item.getStatus() != null && !"CANCELLED".equals(item.getStatus()))
                .count();
        
        // Tüm ürünler iptal edildiyse
        if (activeItemsCount == 0) {
            order.setStatus("CANCELLED");
            if (order.getCancelledAt() == null) {
                order.setCancelledAt(LocalDateTime.now());
            }
            return;
        }
        
        // Aktif ürünlerin durumlarını kontrol et
        long deliveredCount = 0;
        long shippingCount = 0;
        long processingCount = 0;
        long pendingCount = 0;
        
        for (OrderItem item : items) {
            // İptal edilmiş öğeleri atla
            if (item.getStatus() == null || "CANCELLED".equals(item.getStatus())) {
                continue;
            }
            
            switch (item.getStatus()) {
                case "DELIVERED":
                    deliveredCount++;
                    break;
                case "SHIPPING":
                    shippingCount++;
                    break;
                case "PROCESSING":
                    processingCount++;
                    break;
                case "PENDING":
                    pendingCount++;
                    break;
            }
        }
        
        logger.info("Sipariş durumu hesaplanıyor. OrderID: {}, Aktif: {}, Teslim: {}, Kargo: {}, İşleniyor: {}, Bekleyen: {}", 
            order.getId(), activeItemsCount, deliveredCount, shippingCount, processingCount, pendingCount);
        
        // Sipariş durumunu belirle (öncelik sırası önemli)
        if (deliveredCount == activeItemsCount) {
            // Tüm aktif ürünler teslim edildi
            order.setStatus("DELIVERED");
        } else if (processingCount > 0) {
            // En az bir ürün işleniyor
            order.setStatus("PROCESSING");
        } else if (shippingCount > 0) {
            // En az bir ürün kargoda ve işlenen ürün yok
            order.setStatus("SHIPPING");
        } else {
            // Diğer durumlar (tüm aktif ürünler beklemede)
            order.setStatus("PENDING");
        }
        
        logger.info("Sipariş durumu güncellendi. OrderID: {}, Yeni Durum: {}", order.getId(), order.getStatus());
    }

    /**
     * Statüs değerinin geçerli olup olmadığını kontrol eder
     */
    private boolean isValidStatus(String status) {
        return "PENDING".equals(status) || 
               "PROCESSING".equals(status) || 
               "SHIPPING".equals(status) || 
               "DELIVERED".equals(status) || 
               "CANCELLED".equals(status);
    }

    @Override
    @Transactional
    public OrderDto cancelOrderItem(Long orderId, Long itemId, Long userId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Sipariş bulunamadı"));
        
        // Sipariş sahibini kontrol et
        if (!order.getUser().getId().equals(userId)) {
            throw new IllegalStateException("Bu siparişi iptal etme yetkiniz yok");
        }
        
        // Sipariş öğesini bul
        OrderItem itemToCancel = order.getItems().stream()
                .filter(item -> item.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Sipariş öğesi bulunamadı"));
        
        logger.info("Sipariş öğesi iptal isteği alındı. Sipariş ID: {}, Öğe ID: {}, Durum: {}", 
                   orderId, itemId, itemToCancel.getStatus());
        
        // Sadece belirli durumlardaki sipariş öğeleri iptal edilebilir
        if (!"PENDING".equals(itemToCancel.getStatus()) && !"PROCESSING".equals(itemToCancel.getStatus())) {
            throw new IllegalStateException("Sadece bekleyen veya işleme alınan sipariş öğeleri iptal edilebilir");
        }
        
        // İptal edilen ürünün toplam fiyatını hesapla ve sipariş toplam fiyatından çıkar
        BigDecimal cancelAmount = itemToCancel.getPrice().multiply(BigDecimal.valueOf(itemToCancel.getQuantity()));
        BigDecimal currentTotal = order.getTotalPrice();
        BigDecimal updatedTotal = currentTotal.subtract(cancelAmount);
        order.setTotalPrice(updatedTotal);
        logger.info("Sipariş toplam tutarı güncellendi. OrderID: {}, Eski Tutar: {}, İade Edilen: {}, Yeni Tutar: {}", 
                   orderId, currentTotal, cancelAmount, updatedTotal);
        
        // İptal edildiğinde stoku geri ekle
        // Varyant kontrolü
        if (itemToCancel.getVariantId() != null) {
            logger.info("İptal edilen sipariş öğesinde varyant bulundu. VariantID: {}", itemToCancel.getVariantId());
            
            try {
                // Varyant stoğunu geri ekle
                ProductVariant variant = productVariantRepository.findById(itemToCancel.getVariantId())
                    .orElseThrow(() -> new ResourceNotFoundException("Ürün varyantı bulunamadı: " + itemToCancel.getVariantId()));
                
                int oldVariantStock = variant.getStockQuantity();
                int newVariantStock = oldVariantStock + itemToCancel.getQuantity();
                variant.setStockQuantity(newVariantStock);
                
                productVariantRepository.save(variant);
                logger.info("Varyant stoğu geri eklendi: {} -> {}", oldVariantStock, newVariantStock);
            } catch (Exception e) {
                logger.error("Varyant stoğu geri eklenirken hata oluştu. VariantID: {}, Hata: {}", 
                            itemToCancel.getVariantId(), e.getMessage());
            }
        }
        
        // Ana ürün stoğunu her durumda geri ekle
        try {
            Product product = productRepository.findById(itemToCancel.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Ürün bulunamadı: " + itemToCancel.getProductId()));
            
            int oldStock = product.getStock();
            int newStock = oldStock + itemToCancel.getQuantity();
            product.setStock(newStock);
            
            // Eğer ürün stoğu sıfırdan yeniden aktifleştiyse, mağazanın aktif ürün sayısını artır
            if (oldStock == 0 && newStock > 0 && product.getStore() != null) {
                Store store = product.getStore();
                store.incrementActiveProductsCount();
                logger.info("Mağaza aktif ürün sayısı artırıldı. StoreID: {}", store.getId());
            }
            
            productRepository.save(product);
            logger.info("Ürün stoğu geri eklendi: ProductID: {}, {} -> {}", itemToCancel.getProductId(), oldStock, newStock);
        } catch (Exception e) {
            logger.error("Ürün stoğu geri eklenirken hata oluştu. ProductID: {}, Hata: {}", 
                        itemToCancel.getProductId(), e.getMessage());
        }
        
        // Kısmi ödeme iadesi
        if (order.getPaymentIntentId() != null && !"REFUNDED".equals(order.getRefundStatus())) {
            try {
                // Sadece iptal edilen sipariş öğesinin tutarını hesapla
                BigDecimal itemTotalPrice = itemToCancel.getPrice().multiply(BigDecimal.valueOf(itemToCancel.getQuantity()));
                
                // Miktarı kuruşa çevir (TL -> kuruş)
                long amountInCents = itemTotalPrice.multiply(new BigDecimal("100")).longValue();
                
                RefundRequestDto refundRequest = new RefundRequestDto();
                refundRequest.setPaymentIntentId(order.getPaymentIntentId());
                refundRequest.setAmount(amountInCents);
                refundRequest.setReason("requested_by_customer");
                
                RefundResponseDto refundResponse = paymentService.refundPayment(refundRequest);
                
                // İade bilgilerini güncelle
                // Eğer önceden kısmi iade yapıldıysa, önceki iade tutarı ile şimdiki iade tutarını topla
                BigDecimal totalRefundAmount;
                if (order.getRefundAmount() != null) {
                    totalRefundAmount = order.getRefundAmount().add(new BigDecimal(refundResponse.getAmount()).divide(new BigDecimal("100")));
                } else {
                    totalRefundAmount = new BigDecimal(refundResponse.getAmount()).divide(new BigDecimal("100"));
                }
                
                order.setRefundId(refundResponse.getRefundId());
                order.setRefundStatus("PARTIALLY_REFUNDED");
                order.setRefundAmount(totalRefundAmount);
                
                logger.info("Sipariş öğesi için kısmi iade yapıldı. Sipariş: {}, Öğe: {}, İade tutar: {}, İade ID: {}", 
                            orderId, itemId, itemTotalPrice, refundResponse.getRefundId());
            } catch (StripeException e) {
                // İade başarısız olsa bile sipariş öğesini iptal edelim, ama hatayı loglayalım
                logger.error("Sipariş öğesi iptal edildi ancak ödeme iadesi başarısız oldu. Sipariş ID: " + 
                            orderId + ", Öğe ID: " + itemId, e);
            }
        }
        
        // Sipariş öğesinin durumunu güncelle
        itemToCancel.setStatus("CANCELLED");
        
        // Tüm sipariş öğelerinin durumunu kontrol et ve ana sipariş durumunu güncelle
        updateOrderStatusBasedOnItems(order);
        
        Order savedOrder = orderRepository.save(order);
        logger.info("Sipariş öğesi başarıyla iptal edildi. Sipariş ID: {}, Öğe ID: {}", orderId, itemId);
        
        return mapToOrderDto(savedOrder);
    }

    private OrderDto mapToOrderDto(Order order) {
        List<OrderItemDto> orderItemDtos = order.getItems().stream()
                .map(item -> OrderItemDto.builder()
                        .id(item.getId())
                        .productId(item.getProductId())
                        .productName(item.getProductName())
                        .price(item.getPrice())
                        .quantity(item.getQuantity())
                        .image(item.getImage())
                        .storeId(item.getStoreId())
                        .storeName(item.getStoreName())
                        .status(item.getStatus())
                        .trackingNumber(item.getTrackingNumber())
                        .build())
                .collect(Collectors.toList());

        return OrderDto.builder()
                .id(order.getId())
                .orderNumber(order.getOrderNumber())
                .date(order.getDate())
                .totalPrice(order.getTotalPrice())
                .status(order.getStatus())
                .address(order.getAddress())
                .items(orderItemDtos)
                .paymentIntentId(order.getPaymentIntentId())
                .paymentMethod(order.getPaymentMethod())
                .paymentStatus(order.getPaymentStatus())
                .refundId(order.getRefundId())
                .refundStatus(order.getRefundStatus())
                .refundAmount(order.getRefundAmount())
                .cancelledAt(order.getCancelledAt())
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .userId(order.getUser().getId())
                .userName(order.getUser().getFullName())
                .userEmail(order.getUser().getEmail())
                .userPhoneNumber(order.getUser().getPhoneNumber())
                .build();
    }
} 