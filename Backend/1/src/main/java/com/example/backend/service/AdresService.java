package com.example.backend.service;

import com.example.backend.model.*;
import com.example.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdresService {
    private final IlRepository ilRepository;
    private final IlceRepository ilceRepository;
    private final MahalleRepository mahalleRepository;
    private final AdresRepository adresRepository;
    private final UserRepository userRepository;

    public List<Il> getAllIller() {
        return ilRepository.findAll();
    }

    public List<Ilce> getIlcelerByIl(Integer ilId) {
        return ilceRepository.findByIlIlId(ilId);
    }

    public List<Mahalle> getMahallelerByIlce(Integer ilceId) {
        return mahalleRepository.findByIlceIlceId(ilceId);
    }

    public List<Adres> getUserAdresleri(Long userId) {
        return adresRepository.findByUserIdAndAktifTrue(userId);
    }

    @Transactional
    public Adres addAdres(Long userId, AdresRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));

        Il il = ilRepository.findById(request.getIlId())
            .orElseThrow(() -> new RuntimeException("İl bulunamadı"));

        Ilce ilce = ilceRepository.findById(request.getIlceId())
            .orElseThrow(() -> new RuntimeException("İlçe bulunamadı"));

        Mahalle mahalle = mahalleRepository.findById(request.getMahalleId())
            .orElseThrow(() -> new RuntimeException("Mahalle bulunamadı"));

        Adres adres = new Adres();
        adres.setUser(user);
        adres.setIl(il);
        adres.setIlce(ilce);
        adres.setMahalle(mahalle);
        adres.setAdresBasligi(request.getAdresBasligi());
        adres.setDetayAdres(request.getDetayAdres());
        adres.setTelefon(request.getTelefon());
        adres.setAktif(true);

        return adresRepository.save(adres);
    }

    @Transactional
    public void deleteAdres(Long userId, Long adresId) {
        Adres adres = adresRepository.findById(adresId)
            .orElseThrow(() -> new RuntimeException("Adres bulunamadı"));

        if (!adres.getUser().getId().equals(userId)) {
            throw new RuntimeException("Bu adres size ait değil");
        }

        adres.setAktif(false);
        adresRepository.save(adres);
    }
} 