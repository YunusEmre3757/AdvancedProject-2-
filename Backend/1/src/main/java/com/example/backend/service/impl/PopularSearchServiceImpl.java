package com.example.backend.service.impl;

import com.example.backend.model.PopularSearch;
import com.example.backend.repository.PopularSearchRepository;
import com.example.backend.service.PopularSearchService;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.List;
import java.util.Optional;

@Service
public class PopularSearchServiceImpl implements PopularSearchService {

    @Autowired
    private PopularSearchRepository popularSearchRepository;

    @Override
    public List<PopularSearch> getPopularSearches(int limit) {
        if (limit <= 0) {
            limit = 10; // Varsayılan limit
        }
        return popularSearchRepository.findTopSearchesByLimit(limit);
    }

    @Override
    @Transactional
    public PopularSearch incrementSearchCount(String term) {
        if (term == null || term.trim().isEmpty()) {
            throw new IllegalArgumentException("Arama terimi boş olamaz");
        }

        // Terimi normalize et (küçük harfe çevir ve trim yap)
        String normalizedTerm = normalizeSearchTerm(term);

        // Normalize edilmiş terim ile veritabanında ara
        Optional<PopularSearch> existingSearch = popularSearchRepository.findByText(normalizedTerm);

        if (existingSearch.isPresent()) {
            // Varsa sayacı arttır
            PopularSearch search = existingSearch.get();
            search.setCount(search.getCount() + 1);
            return popularSearchRepository.save(search);
        } else {
            // Yoksa yeni kayıt oluştur
            PopularSearch newSearch = new PopularSearch();
            // Orijinal terimi değil normalize edilmiş terimi kaydet
            newSearch.setText(normalizedTerm);
            newSearch.setCount(1);
            return popularSearchRepository.save(newSearch);
        }
    }
    
    /**
     * Arama terimini normalize eder:
     * - Küçük harfe çevirir
     * - Boşlukları temizler
     * - İlk harfi büyük yapar (okunabilirlik için)
     * 
     * @param term Normalize edilecek arama terimi
     * @return Normalize edilmiş terim
     */
    private String normalizeSearchTerm(String term) {
        if (term == null) return "";
        
        // Trim yapıp küçük harfe çevir
        String normalized = term.trim().toLowerCase();
        
        // Terimin ilk harfini büyük yap (okunabilirlik için)
        if (normalized.length() > 0) {
            normalized = normalized.substring(0, 1).toUpperCase() + normalized.substring(1);
        }
        
        return normalized;
    }
} 