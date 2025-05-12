package com.example.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.util.Set;

@Entity
@Data
@Table(name = "variant_attribute_values")
public class VariantAttributeValue {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JoinColumn(name = "variant_id", nullable = false)
    private ProductVariant variant;

    @ManyToOne(fetch = FetchType.LAZY, cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JoinColumn(name = "attribute_id", nullable = false)
    private ProductAttribute attribute;

    @Column(name = "string_value", length = 255)
    private String stringValue;

    @Column(name = "number_value")
    private Double numberValue;

    @Column(name = "select_value", length = 255)
    private String selectValue;

    @ElementCollection
    @CollectionTable(name = "variant_attribute_multi_values",
                    joinColumns = @JoinColumn(name = "variant_attribute_value_id"))
    @Column(name = "value", length = 1000)
    private Set<String> multiSelectValues;
} 