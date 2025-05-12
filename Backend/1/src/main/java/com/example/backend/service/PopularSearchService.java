package com.example.backend.service;

import com.example.backend.model.PopularSearch;
import java.util.List;

public interface PopularSearchService {
    
    /**
     * Belirli bir limite göre en popüler aramaları getirir.
     * 
     * @param limit Getirilecek popüler arama sayısı
     * @return Popüler aramaların listesi
     */
    List<PopularSearch> getPopularSearches(int limit);
    
    /**
     * Bir arama teriminin sayacını artırır. Terim veritabanında yoksa ekler.
     * 
     * @param term Sayacı artırılacak arama terimi
     * @return Güncellenmiş PopularSearch nesnesi
     */
    PopularSearch incrementSearchCount(String term);
} 