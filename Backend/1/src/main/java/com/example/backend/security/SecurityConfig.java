package com.example.backend.security;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final UserDetailsService userDetailsService;
    private final JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;

    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthFilter,
            @Qualifier("customUserDetailsService") UserDetailsService userDetailsService,
            JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.userDetailsService = userDetailsService;
        this.jwtAuthenticationEntryPoint = jwtAuthenticationEntryPoint;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                        // Public endpoints - herkes erişebilir
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/products/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/categories/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/brands/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/stores/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/comments/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/attributes/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/files/**").permitAll()
                        
                        // Authentication endpoints
                        .requestMatchers("/api/auth/login").permitAll()
                        .requestMatchers("/api/auth/register").permitAll()
                        .requestMatchers("/api/auth/refresh-token").permitAll()
                        .requestMatchers("/api/auth/store-login").permitAll() // Mağaza giriş endpoint'i
                        
                        // Verification endpoints
                        .requestMatchers("/api/verification/**").permitAll()
                        
                        // Product, Category and Brand endpoints (public)
                        .requestMatchers("/api/categories/**").permitAll()
                        .requestMatchers("/api/products/**").permitAll()
                        .requestMatchers("/api/brands/**").permitAll()
                        
                        // Payment endpoints
                        .requestMatchers("/api/payments/create-payment-intent").authenticated()
                        .requestMatchers("/api/payments/confirm-payment").authenticated()
                        .requestMatchers("/api/payments/cancel-payment/**").authenticated()
                        
                        // Store endpoints - public okuma işlemleri
                        .requestMatchers(
                            "/api/stores",
                            "/api/stores/popular",
                            "/api/stores/search",
                            "/api/stores/category/**",
                            "/api/stores/product-category/**").permitAll()
                        // Only allow GET requests for store detail endpoints
                        .requestMatchers(HttpMethod.GET, "/api/stores/{id}").permitAll()
                        .requestMatchers(
                            "/api/stores/{id:\\d+}/products",
                            "/api/stores/{id:\\d+}/products/featured").permitAll()
                        
                        // Require authentication for all non-GET requests to store endpoints
                        .requestMatchers(HttpMethod.PUT, "/api/stores/{id}").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/stores/{id}").authenticated()
                        
                        // Special seller endpoints
                        .requestMatchers("/api/stores/seller/**").authenticated()
                        
                        // Store endpoints - satıcı yetkilendirmesi gerektiren işlemler
                        .requestMatchers("/api/stores/my-stores").authenticated()
                        .requestMatchers("/api/stores/user/**").authenticated()
                        // Store application endpoints
                        .requestMatchers("/api/stores/applications/**").authenticated() // Tüm mağaza başvuru işlemleri authentication gerektirir
                        // Popular searches increment endpoint (public)
                        .requestMatchers(HttpMethod.POST, "/api/products/popular-searches/increment").permitAll()
                        .requestMatchers("/api/products/create").authenticated()
                        .requestMatchers("/api/products/update/**").authenticated()
                        .requestMatchers("/api/products/delete/**").authenticated()
                        .requestMatchers("/api/products/store/**").authenticated()

                        // KALDIRILACAK Store status endpoint - SELLER veya ADMIN rolü gerektirir
                        .requestMatchers("/api/admin/stores/*/status").hasAnyAuthority("ADMIN", "SELLER")
                        .requestMatchers("/api/admin/stores/*/set-inactive").hasAnyAuthority("ADMIN", "SELLER")
                        
                        // Store applications endpoint - kimliği doğrulanmış kullanıcılar erişebilir
                        .requestMatchers("/api/stores/applications").authenticated()
                        
                        // Test endpoints - allow without authentication
                        .requestMatchers("/api/test/**").permitAll()
                        .requestMatchers("/api/stores/search/products/featured").permitAll()
                        
                        // Admin endpoints require ADMIN role
                        .requestMatchers("/api/admin/**").hasAuthority("ADMIN")
                        
                        // User endpoints require authentication
                        .requestMatchers("/api/users/**").authenticated()
                        .requestMatchers("/api/orders/**").authenticated()
                        .requestMatchers("/api/store-orders/**").authenticated()
                        .requestMatchers("/api/stores/applications/**").authenticated()
                        // Review endpoint'leri için izin ekleyin
                        .requestMatchers("/api/reviews/products/**").permitAll()
                        
                        // All other endpoints require authentication
                        .anyRequest().authenticated()
                )
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint(jwtAuthenticationEntryPoint)
                )
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of("http://localhost:4200"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
} 