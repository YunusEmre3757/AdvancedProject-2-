package com.example.backend.service;

import com.example.backend.model.ProductAttribute;
import com.example.backend.repository.ProductAttributeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ProductAttributeService {

    @Autowired
    private ProductAttributeRepository productAttributeRepository;

    @Transactional(readOnly = true)
    public List<ProductAttribute> getAttributesByCategory(Long categoryId) {
        return productAttributeRepository.findByCategoryId(categoryId);
    }

    @Transactional(readOnly = true)
    public List<ProductAttribute> getAttributesByProduct(Long productId) {
        return productAttributeRepository.findByValuesProductId(productId);
    }

    @Transactional(readOnly = true)
    public List<ProductAttribute> getAttributesByTypeAndCategory(String type, Long categoryId) {
        return productAttributeRepository.findByTypeAndCategoryId(type, categoryId);
    }

    @Transactional
    public ProductAttribute saveAttribute(ProductAttribute attribute) {
        return productAttributeRepository.save(attribute);
    }

    @Transactional
    public void deleteAttribute(Long id) {
        productAttributeRepository.deleteById(id);
    }
} 