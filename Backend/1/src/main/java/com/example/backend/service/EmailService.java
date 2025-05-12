package com.example.backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {

    private final JavaMailSender mailSender;
    
    @Autowired
    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }
    
    public void sendVerificationEmail(String to, String verificationCode) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, "utf-8");
            
            helper.setTo(to);
            helper.setSubject("Email Verification");
            
            String htmlContent = 
                "<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;'>" +
                    "<div style='text-align: center; padding: 10px 0; background-color: #f8f9fa; margin-bottom: 20px;'>" +
                        "<h1 style='color: #2c3e50; margin: 0;'>Email Verification</h1>" +
                    "</div>" +
                    "<div style='padding: 20px; background-color: #ffffff;'>" +
                        "<p style='font-size: 16px; color: #34495e;'>Thank you for signing up! Please use the verification code below to complete your registration:</p>" +
                        "<div style='text-align: center; margin: 30px 0;'>" +
                            "<span style='font-size: 28px; font-weight: bold; padding: 10px 20px; background-color: #f8f9fa; border-radius: 5px; letter-spacing: 5px;'>" + verificationCode + "</span>" +
                        "</div>" +
                        "<p style='font-size: 14px; color: #7f8c8d;'>If you didn't request this verification, please ignore this email.</p>" +
                    "</div>" +
                    "<div style='text-align: center; padding: 15px; background-color: #f8f9fa; font-size: 12px; color: #7f8c8d;'>" +
                        "© 2023 Esatis. All rights reserved." +
                    "</div>" +
                "</div>";
            
            helper.setText(htmlContent, true);
            mailSender.send(mimeMessage);
            
        } catch (MessagingException e) {
            System.err.println("Failed to send verification email: " + e.getMessage());
            sendVerificationEmailMock(to, verificationCode);
        }
    }
    
    // Placeholder method for testing without actual email sending
    public void sendVerificationEmailMock(String to, String verificationCode) {
        System.out.println("Sending email to: " + to);
        System.out.println("Verification code: " + verificationCode);
    }
    
    /**
     * Mağaza onay e-postasını gönderir
     */
    public void sendStoreApprovalEmail(String to, String ownerName, String storeName) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, "utf-8");
            
            helper.setTo(to);
            helper.setSubject("Mağaza Başvurunuz Onaylandı: " + storeName);
            
            String htmlContent = 
                "<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;'>" +
                    "<div style='text-align: center; padding: 15px 0; background-color: #4CAF50; margin-bottom: 20px;'>" +
                        "<h1 style='color: white; margin: 0;'>Mağaza Başvurunuz Onaylandı</h1>" +
                    "</div>" +
                    "<div style='padding: 20px; background-color: #ffffff;'>" +
                        "<p style='font-size: 16px; color: #34495e;'>Sayın <strong>" + ownerName + "</strong>,</p>" +
                        "<p style='font-size: 16px; color: #34495e;'><strong>\"" + storeName + "\"</strong> isimli mağaza başvurunuz onaylanmıştır.</p>" +
                        "<p style='font-size: 16px; color: #34495e;'>Artık mağazanızı yönetebilir ve ürün ekleyebilirsiniz.</p>" +
                        "<div style='text-align: center; margin: 30px 0;'>" +
                            "<a href='https://esatis.com/seller' style='background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;'>Mağazanıza Git</a>" +
                        "</div>" +
                        "<p style='font-size: 14px; color: #34495e;'>Detaylar için hesabınızı kontrol edebilirsiniz.</p>" +
                    "</div>" +
                    "<div style='text-align: center; padding: 15px; background-color: #f8f9fa; font-size: 12px; color: #7f8c8d;'>" +
                        "<p>Saygılarımızla,<br>Esatis Ekibi</p>" +
                        "© 2023 Esatis. All rights reserved." +
                    "</div>" +
                "</div>";
            
            helper.setText(htmlContent, true);
            mailSender.send(mimeMessage);
            System.out.println("Mağaza onay e-postası gönderildi: " + to);
            
        } catch (MessagingException e) {
            System.err.println("E-posta gönderimi başarısız: " + e.getMessage());
            sendStoreApprovalEmailMock(to, ownerName, storeName);
        }
    }
    
    /**
     * Test için konsola yazdırır
     */
    public void sendStoreApprovalEmailMock(String to, String ownerName, String storeName) {
        System.out.println("==================== MAĞAZA ONAY E-POSTASI ====================");
        System.out.println("Alıcı: " + to);
        System.out.println("Konu: Mağaza Başvurunuz Onaylandı: " + storeName);
        System.out.println("İçerik: HTML formatında mağaza onay e-postası");
        System.out.println("==============================================================");
    }
    
    /**
     * Mağaza ret e-postasını gönderir
     */
    public void sendStoreRejectionEmail(String to, String ownerName, String storeName) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, "utf-8");
            
            helper.setTo(to);
            helper.setSubject("Mağaza Başvurunuz Reddedildi: " + storeName);
            
            String htmlContent = 
                "<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;'>" +
                    "<div style='text-align: center; padding: 15px 0; background-color: #e74c3c; margin-bottom: 20px;'>" +
                        "<h1 style='color: white; margin: 0;'>Mağaza Başvurunuz Reddedildi</h1>" +
                    "</div>" +
                    "<div style='padding: 20px; background-color: #ffffff;'>" +
                        "<p style='font-size: 16px; color: #34495e;'>Sayın <strong>" + ownerName + "</strong>,</p>" +
                        "<p style='font-size: 16px; color: #34495e;'><strong>\"" + storeName + "\"</strong> isimli mağaza başvurunuz maalesef reddedilmiştir.</p>" +
                        "<div style='margin: 25px 0; padding: 15px; border-left: 4px solid #e74c3c; background-color: #f9f9f9;'>" +
                            "<p style='font-size: 14px; color: #34495e; margin: 0;'>Daha fazla bilgi için müşteri hizmetlerimizle iletişime geçebilirsiniz.</p>" +
                        "</div>" +
                        "<div style='text-align: center; margin: 30px 0;'>" +
                            "<a href='https://esatis.com/contact' style='background-color: #3498db; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;'>Müşteri Hizmetleri</a>" +
                        "</div>" +
                    "</div>" +
                    "<div style='text-align: center; padding: 15px; background-color: #f8f9fa; font-size: 12px; color: #7f8c8d;'>" +
                        "<p>Saygılarımızla,<br>Esatis Ekibi</p>" +
                        "© 2023 Esatis. All rights reserved." +
                    "</div>" +
                "</div>";
            
            helper.setText(htmlContent, true);
            mailSender.send(mimeMessage);
            System.out.println("Mağaza red e-postası gönderildi: " + to);
            
        } catch (MessagingException e) {
            System.err.println("E-posta gönderimi başarısız: " + e.getMessage());
            sendStoreRejectionEmailMock(to, ownerName, storeName);
        }
    }
    
    /**
     * Test için konsola yazdırır
     */
    public void sendStoreRejectionEmailMock(String to, String ownerName, String storeName) {
        System.out.println("==================== MAĞAZA RED E-POSTASI =====================");
        System.out.println("Alıcı: " + to);
        System.out.println("Konu: Mağaza Başvurunuz Reddedildi: " + storeName);
        System.out.println("İçerik: HTML formatında mağaza red e-postası");
        System.out.println("==============================================================");
    }
    
    /**
     * Mağaza yasaklama (ban) e-postasını gönderir
     */
    public void sendStoreBanEmail(String to, String ownerName, String storeName) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, "utf-8");
            
            helper.setTo(to);
            helper.setSubject("Mağazanız Yasaklandı: " + storeName);
            
            String htmlContent = 
                "<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;'>" +
                    "<div style='text-align: center; padding: 15px 0; background-color: #e74c3c; margin-bottom: 20px;'>" +
                        "<h1 style='color: white; margin: 0;'>Mağazanız Yasaklandı</h1>" +
                    "</div>" +
                    "<div style='padding: 20px; background-color: #ffffff;'>" +
                        "<p style='font-size: 16px; color: #34495e;'>Sayın <strong>" + ownerName + "</strong>,</p>" +
                        "<p style='font-size: 16px; color: #34495e;'><strong>\"" + storeName + "\"</strong> isimli mağazanız platformumuzda yasaklanmıştır.</p>" +
                        "<div style='margin: 20px 0; padding: 15px; border-left: 4px solid #e74c3c; background-color: #f9f9f9;'>" +
                            "<p style='font-size: 14px; color: #34495e; margin: 0;'>Bu yasak, mağazanızın platformumuzun kurallarını ihlal ettiği tespit edildiğinden uygulanmıştır.</p>" +
                            "<p style='font-size: 14px; color: #e74c3c; font-weight: bold; margin-top: 10px;'>Yasak süresince mağazanız ve ürünleriniz müşteriler tarafından görüntülenemeyecektir.</p>" +
                        "</div>" +
                        "<p style='font-size: 16px; color: #34495e;'>Daha fazla bilgi için müşteri hizmetlerimizle iletişime geçebilirsiniz.</p>" +
                        "<div style='text-align: center; margin: 30px 0;'>" +
                            "<a href='https://esatis.com/contact' style='background-color: #3498db; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;'>Müşteri Hizmetleri</a>" +
                        "</div>" +
                    "</div>" +
                    "<div style='text-align: center; padding: 15px; background-color: #f8f9fa; font-size: 12px; color: #7f8c8d;'>" +
                        "<p>Saygılarımızla,<br>Esatis Ekibi</p>" +
                        "© 2023 Esatis. All rights reserved." +
                    "</div>" +
                "</div>";
            
            helper.setText(htmlContent, true);
            mailSender.send(mimeMessage);
            System.out.println("Mağaza yasaklama e-postası gönderildi: " + to);
            
        } catch (MessagingException e) {
            System.err.println("E-posta gönderimi başarısız: " + e.getMessage());
            sendStoreBanEmailMock(to, ownerName, storeName);
        }
    }
    
    /**
     * Test için konsola yazdırır
     */
    public void sendStoreBanEmailMock(String to, String ownerName, String storeName) {
        System.out.println("==================== MAĞAZA YASAKLAMA E-POSTASI ==============");
        System.out.println("Alıcı: " + to);
        System.out.println("Konu: Mağazanız Yasaklandı: " + storeName);
        System.out.println("İçerik: HTML formatında mağaza yasaklama e-postası");
        System.out.println("==============================================================");
    }
    
    /**
     * Mağaza yasak kaldırma (unban) e-postasını gönderir
     */
    public void sendStoreUnbanEmail(String to, String ownerName, String storeName) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, "utf-8");
            
            helper.setTo(to);
            helper.setSubject("Mağazanızın Yasağı Kaldırıldı: " + storeName);
            
            String htmlContent = 
                "<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;'>" +
                    "<div style='text-align: center; padding: 15px 0; background-color: #27ae60; margin-bottom: 20px;'>" +
                        "<h1 style='color: white; margin: 0;'>Mağazanızın Yasağı Kaldırıldı</h1>" +
                    "</div>" +
                    "<div style='padding: 20px; background-color: #ffffff;'>" +
                        "<p style='font-size: 16px; color: #34495e;'>Sayın <strong>" + ownerName + "</strong>,</p>" +
                        "<p style='font-size: 16px; color: #34495e;'><strong>\"" + storeName + "\"</strong> isimli mağazanızın yasağı kaldırılmıştır.</p>" +
                        "<div style='margin: 20px 0; padding: 15px; border-left: 4px solid #27ae60; background-color: #f9f9f9;'>" +
                            "<p style='font-size: 14px; color: #27ae60; font-weight: bold;'>Artık mağazanız ve ürünleriniz tekrar müşteriler tarafından görüntülenebilir durumdadır.</p>" +
                        "</div>" +
                        "<p style='font-size: 16px; color: #34495e;'>Platformumuzun kurallarına uymanız ve kaliteli hizmet sağlamanız için teşekkür ederiz.</p>" +
                        "<div style='text-align: center; margin: 30px 0;'>" +
                            "<a href='https://esatis.com/seller' style='background-color: #27ae60; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;'>Mağazanıza Git</a>" +
                        "</div>" +
                    "</div>" +
                    "<div style='text-align: center; padding: 15px; background-color: #f8f9fa; font-size: 12px; color: #7f8c8d;'>" +
                        "<p>Saygılarımızla,<br>Esatis Ekibi</p>" +
                        "© 2023 Esatis. All rights reserved." +
                    "</div>" +
                "</div>";
            
            helper.setText(htmlContent, true);
            mailSender.send(mimeMessage);
            System.out.println("Mağaza yasak kaldırma e-postası gönderildi: " + to);
            
        } catch (MessagingException e) {
            System.err.println("E-posta gönderimi başarısız: " + e.getMessage());
            sendStoreUnbanEmailMock(to, ownerName, storeName);
        }
    }
    
    /**
     * Test için konsola yazdırır
     */
    public void sendStoreUnbanEmailMock(String to, String ownerName, String storeName) {
        System.out.println("==================== MAĞAZA YASAK KALDIRMA E-POSTASI =========");
        System.out.println("Alıcı: " + to);
        System.out.println("Konu: Mağazanızın Yasağı Kaldırıldı: " + storeName);
        System.out.println("İçerik: HTML formatında mağaza yasak kaldırma e-postası");
        System.out.println("==============================================================");
    }
    
    /**
     * Şifre sıfırlama e-postasını gönderir
     */
    public void sendPasswordResetEmail(String to, String resetToken) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, "utf-8");
            
            helper.setTo(to);
            helper.setSubject("Şifre Sıfırlama");
            
            // Frontend URL - adjust according to your application
            String resetUrl = "http://localhost:4200/auth/reset-password?token=" + resetToken;
            
            String htmlContent = 
                "<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;'>" +
                    "<div style='text-align: center; padding: 10px 0; background-color: #3498db; margin-bottom: 20px;'>" +
                        "<h1 style='color: white; margin: 0;'>Şifre Sıfırlama</h1>" +
                    "</div>" +
                    "<div style='padding: 20px; background-color: #ffffff;'>" +
                        "<p style='font-size: 16px; color: #34495e;'>Şifrenizi sıfırlamak için talepte bulundunuz. Aşağıdaki butona tıklayarak yeni bir şifre belirleyebilirsiniz:</p>" +
                        "<div style='text-align: center; margin: 30px 0;'>" +
                            "<a href='" + resetUrl + "' style='background-color: #3498db; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;'>Şifremi Sıfırla</a>" +
                        "</div>" +
                        "<p style='font-size: 14px; color: #7f8c8d;'>Bu bağlantı 24 saat boyunca geçerlidir.</p>" +
                        "<p style='font-size: 14px; color: #7f8c8d;'>Eğer şifre sıfırlama talebinde bulunmadıysanız, lütfen bu e-postayı dikkate almayınız.</p>" +
                    "</div>" +
                    "<div style='text-align: center; padding: 15px; background-color: #f8f9fa; font-size: 12px; color: #7f8c8d;'>" +
                        "<p>Saygılarımızla,<br>Esatis Ekibi</p>" +
                        "© 2023 Esatis. All rights reserved." +
                    "</div>" +
                "</div>";
            
            helper.setText(htmlContent, true);
            mailSender.send(mimeMessage);
            System.out.println("Şifre sıfırlama e-postası gönderildi: " + to);
            
        } catch (MessagingException e) {
            System.err.println("E-posta gönderimi başarısız: " + e.getMessage());
            sendPasswordResetEmailMock(to, resetToken);
        }
    }
    
    /**
     * Test için konsola yazdırır
     */
    public void sendPasswordResetEmailMock(String to, String resetToken) {
        System.out.println("==================== ŞİFRE SIFIRLAMA E-POSTASI ===============");
        System.out.println("Alıcı: " + to);
        System.out.println("Konu: Şifre Sıfırlama");
        System.out.println("Sıfırlama Token: " + resetToken);
        System.out.println("Sıfırlama URL: http://localhost:4200/auth/reset-password?token=" + resetToken);
        System.out.println("==============================================================");
    }
} 