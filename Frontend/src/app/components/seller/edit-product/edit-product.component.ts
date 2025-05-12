import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../../../services/product.service';
import { Product, ProductVariant } from '../../../models/product.interface';
import { CategoryService } from '../../../services/category.service';
import { BrandService } from '../../../services/brand.service';
import { Category } from '../../../models/Category';
import { Brand } from '../../../models/brand.interface';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AuthService } from '../../../services/auth.service';

interface ExtendedProduct extends Product {
  showVariants?: boolean;
}

@Component({
  selector: 'app-edit-product',
  templateUrl: './edit-product.component.html',
  styleUrls: ['./edit-product.component.css'],
  standalone: false,
})
export class EditProductComponent implements OnInit {
  products: ExtendedProduct[] = [];
  loading = true;
  error: string | null = null;
  page = 0;
  size = 10;
  totalProducts = 0;
  searchQuery = '';
  storeId: string | null = null;
  
  // Math object for calculations
  Math = Math;
  
  // Product details variables
  selectedProduct: ExtendedProduct | null = null;
  showProductDetailsModal = false;
  productDetailsLoading = false;
  
  // Status update variables
  statusUpdateProcessing = false;
  statusUpdateSuccess = false;
  statusUpdateMessage = '';
  
  // Edit product variables
  productToEdit: Partial<ExtendedProduct> = this.getEmptyProduct();
  showProductEditModal = false;
  isNewProduct = true;
  editModalTitle = 'Yeni Ürün Ekle';
  
  // Filters
  categoryFilter: string = '';
  minPriceFilter: number | null = null;
  maxPriceFilter: number | null = null;
  stockFilter: string = 'all'; // all, instock, outofstock
  
  // Categories list
  categories: Category[] = [];
  categoryHierarchy: any[] = [];
  
  // Brands list
  brands: Brand[] = [];
  
  // Variant editing variables
  variantToEdit: Partial<ProductVariant> = {};
  showVariantEditModal = false;
  editVariantTitle = '';
  currentProductId = 0;
  
  // New attribute variables
  showAddAttributeForm = false;
  newAttributeKey = '';
  newAttributeValue = '';
  
  // Available colors and sizes
  availableColors = [
    { name: 'Siyah', code: '#000000' },
    { name: 'Beyaz', code: '#FFFFFF' },
    { name: 'Kırmızı', code: '#FF0000' },
    { name: 'Yeşil', code: '#008000' },
    { name: 'Mavi', code: '#0000FF' },
    { name: 'Sarı', code: '#FFFF00' },
    { name: 'Mor', code: '#800080' },
    { name: 'Turuncu', code: '#FFA500' },
    { name: 'Pembe', code: '#FFC0CB' },
    { name: 'Gri', code: '#808080' },
    { name: 'Kahverengi', code: '#A52A2A' },
    { name: 'Lacivert', code: '#000080' },
    { name: 'Bej', code: '#F5F5DC' },
    { name: 'Turkuaz', code: '#40E0D0' },
    { name: 'Bordo', code: '#800000' }
  ];
  
  availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private brandService: BrandService,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.storeId = params['id'];
        console.log('Store ID from route:', this.storeId);
      }
      
      this.loadCategories();
      this.loadBrands();
      this.loadProducts();
    });
  }
  
  // Load all categories
  loadCategories(): void {
    this.categoryService.getAllCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
        console.log('Categories loaded:', this.categories);
      },
      error: (err) => {
        console.error('Error loading categories:', err);
        this.showErrorMessage('Kategoriler yüklenirken bir hata oluştu');
      }
    });
    
    // Load category hierarchy
    this.categoryService.getCategoryHierarchy().subscribe({
      next: (hierarchy) => {
        this.categoryHierarchy = hierarchy;
        console.log('Category hierarchy loaded:', this.categoryHierarchy);
      },
      error: (err) => {
        console.error('Error loading category hierarchy:', err);
      }
    });
  }
  
  // Load all brands
  loadBrands(): void {
    this.brandService.getBrands().subscribe({
      next: (response: { items: Brand[], total: number }) => {
        this.brands = response.items;
        console.log('Brands loaded:', this.brands);
      },
      error: (err: any) => {
        console.error('Error loading brands:', err);
        this.showErrorMessage('Markalar yüklenirken bir hata oluştu');
      }
    });
  }
  
  // Load store products
  loadProducts(): void {
    this.loading = true;
    
    // Create parameters object that includes filters
    const params: any = {
      page: this.page,
      size: this.size
    };
    
    // Add category filter if selected
    if (this.categoryFilter) {
      params.category = this.categoryFilter.toString();
    }
    
    // Add price range filters if set
    if (this.minPriceFilter !== null) {
      params.minPrice = this.minPriceFilter;
    }
    
    if (this.maxPriceFilter !== null) {
      params.maxPrice = this.maxPriceFilter;
    }
    
    // Add stock filter
    if (this.stockFilter !== 'all') {
      params.stockFilter = this.stockFilter;
    }
    
    if (this.storeId) {
      // If we have a storeId, load products for that specific store
      console.log('Loading products for store ID:', this.storeId);
      this.productService.getProductsByStore(this.storeId, params).subscribe({
        next: (response) => {
          this.products = response.items;
          this.totalProducts = response.total;
          
          // Process products
          this.processProductsAfterLoad();
          
          this.loading = false;
          console.log('Store products loaded:', this.products);
        },
        error: (err) => {
          console.error('Error loading store products:', err);
          this.error = 'Mağaza ürünleri yüklenirken bir hata oluştu.';
          this.loading = false;
          this.showErrorMessage('Mağaza ürünleri yüklenirken bir hata oluştu');
        }
      });
    } else {
      // If no storeId, load all seller products
      console.log('Loading all products (no store ID)');
      this.productService.getProducts(params).subscribe({
        next: (response) => {
          this.products = response.items;
          this.totalProducts = response.total;
          
          // Process products
          this.processProductsAfterLoad();
          
          this.loading = false;
          console.log('All products loaded:', this.products);
        },
        error: (err) => {
          console.error('Error loading products:', err);
          this.error = 'Ürün listesi yüklenirken bir hata oluştu.';
          this.loading = false;
          this.showErrorMessage('Ürünler yüklenirken bir hata oluştu');
        }
      });
    }
  }
  
  // Search products
  searchProducts(): void {
    if (!this.searchQuery.trim()) {
      this.loadProducts();
      return;
    }

    this.loading = true;
    
    // Create parameters object with filters
    const params: any = {
      page: this.page,
      size: this.size
    };
    
    if (this.categoryFilter) {
      params.category = this.categoryFilter.toString();
    }
    
    if (this.stockFilter !== 'all') {
      params.stockFilter = this.stockFilter;
    }
    
    if (this.storeId) {
      // If we have a store ID, use the store-specific search
      console.log('Searching products for store ID:', this.storeId);
      this.productService.searchSellerStoreProducts(this.storeId, this.searchQuery, params).subscribe({
        next: (response) => {
          this.products = response.items;
          this.totalProducts = response.total;
          
          // Ensure status is properly set for each product
          this.processProductsAfterLoad();
          
          this.loading = false;
          
          if (this.products.length === 0) {
            this.showInfoMessage('Arama sonucunda ürün bulunamadı');
          }
        },
        error: (err) => {
          console.error('Error searching store products:', err);
          this.error = 'Mağaza ürünleri aranırken bir hata oluştu.';
          this.loading = false;
          this.showErrorMessage('Mağaza ürünleri aramasında bir hata oluştu');
        }
      });
    } else {
      // Add storeId to params if available
      // For compatibility with the general search (without a specific store)
      if (this.storeId) {
        params.storeId = this.storeId;
      }
      
      this.productService.searchProducts(this.searchQuery, params).subscribe({
        next: (response) => {
          this.products = response.items;
          this.totalProducts = response.total;
          
          // Ensure status is properly set for each product
          this.processProductsAfterLoad();
          
          this.loading = false;
          
          if (this.products.length === 0) {
            this.showInfoMessage('Arama sonucunda ürün bulunamadı');
          }
        },
        error: (err) => {
          console.error('Error searching products:', err);
          this.error = 'Ürün araması yapılırken bir hata oluştu.';
          this.loading = false;
          this.showErrorMessage('Ürün aramasında bir hata oluştu');
        }
      });
    }
  }
  
  // Helper method to process products after loading or searching
  private processProductsAfterLoad(): void {
    // Ensure status is properly set for each product
    this.products.forEach(product => {
      // Ensure status is properly set
      if (!product.status && product.isActive) {
        product.status = 'active';
      } else if (!product.status) {
        product.status = 'inactive';
      }
      
      if (product.variants && product.variants.length > 0) {
        // Calculate total stock from variants
        const totalStock = product.variants.reduce((sum, variant) => sum + (variant.stock || 0), 0);
        product.stock = totalStock;
        product.totalStock = totalStock;
        
        // Ensure variant status is properly set
        product.variants.forEach(variant => {
          if (!variant.status && variant.active) {
            variant.status = 'active';
          } else if (!variant.status) {
            variant.status = 'inactive';
          }
        });
      }
    });
  }
  
  // Handle page changes
  onPageChange(event: number): void {
    this.page = event;
    if (this.searchQuery.trim()) {
      this.searchProducts();
    } else {
      this.loadProducts();
    }
  }
  
  // Get page numbers for pagination
  getPageNumbers(): any[] {
    const totalPages = Math.ceil(this.totalProducts / this.size);
    let pages: any[] = [];
    
    if (totalPages <= 5) {
      for (let i = 0; i < totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (this.page < 2) {
        pages = [0, 1, 2, '...', totalPages - 1];
      } else if (this.page > totalPages - 3) {
        pages = [0, '...', totalPages - 3, totalPages - 2, totalPages - 1];
      } else {
        pages = [0, '...', this.page - 1, this.page, this.page + 1, '...', totalPages - 1];
      }
    }
    
    return pages;
  }
  
  // Check if a value is a number
  isNumber(value: any): boolean {
    return typeof value === 'number';
  }
  
  // Get the last page index
  getLastPageIndex(): number {
    return Math.ceil(this.totalProducts / this.size) - 1;
  }
  
  // Open the add product modal
  openAddProductModal(): void {
    this.productToEdit = this.getEmptyProduct();
    if (this.storeId) {
      this.productToEdit.storeId = this.storeId;
    }
    this.isNewProduct = true;
    this.editModalTitle = 'Yeni Ürün Ekle';
    this.showProductEditModal = true;
  }
  
  // Open edit product modal
  openEditProductModal(product: ExtendedProduct): void {
    // Deep clone the product to avoid affecting the original
    this.productToEdit = {...JSON.parse(JSON.stringify(product))};
    
    // Set the categoryId if category is an object
    if (product.category && typeof product.category === 'object' && product.category.id) {
      this.productToEdit.categoryId = product.category.id;
    } else if (typeof product.category === 'string') {
      // Find the matching category by name
      const matchingCategory = this.categories.find(c => c.name.toLowerCase() === product.category.toString().toLowerCase());
      if (matchingCategory) {
        this.productToEdit.categoryId = matchingCategory.id;
      }
    }
    
    // Set brandId if brand is an object
    if (product.brand && typeof product.brand === 'object' && product.brand.id) {
      this.productToEdit.brand = product.brand;
    }
    
    this.isNewProduct = false;
    this.editModalTitle = 'Ürün Düzenle: ' + product.name;
    this.showProductEditModal = true;
  }
  
  // Close product edit modal
  closeProductEditModal(): void {
    this.showProductEditModal = false;
  }
  
  // Save product
  saveProduct(): void {
    // Convert categoryId to category object
    if (this.productToEdit.categoryId) {
      const categoryId = this.productToEdit.categoryId;
      const selectedCategory = this.categories.find(c => c.id === categoryId);
      if (selectedCategory) {
        this.productToEdit.category = selectedCategory as any;
      }
    }
    
    if (this.isNewProduct) {
      this.productService.addProduct(this.productToEdit as Omit<ExtendedProduct, 'id'>).subscribe({
        next: (product) => {
          this.showSuccessMessage('Ürün başarıyla eklendi');
          this.closeProductEditModal();
          this.loadProducts();
        },
        error: (err) => {
          console.error('Error adding product:', err);
          this.showErrorMessage('Ürün eklenirken bir hata oluştu: ' + 
            (err.error?.message || err.message || 'Bilinmeyen hata'));
        }
      });
    } else {
      this.productService.updateSellerProduct(this.productToEdit.id!, this.productToEdit).subscribe({
        next: (product) => {
          this.showSuccessMessage('Ürün başarıyla güncellendi');
          this.closeProductEditModal();
          // Update the product in the list
          const index = this.products.findIndex(p => p.id === product.id);
          if (index !== -1) {
            this.products[index] = product;
          }
        },
        error: (err) => {
          console.error('Error updating product:', err);
          this.showErrorMessage('Ürün güncellenirken bir hata oluştu: ' + 
            (err.error?.message || err.message || 'Bilinmeyen hata'));
        }
      });
    }
  }
  
  // Delete product
  deleteProduct(productId: number): void {
    if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) {
      return;
    }
    
    this.productService.deleteSellerProduct(productId).subscribe({
      next: () => {
        this.showSuccessMessage('Ürün başarıyla silindi');
        // Remove the product from the list
        this.products = this.products.filter(p => p.id !== productId);
        this.totalProducts--; // Update total count
      },
      error: (err) => {
        console.error('Error deleting product:', err);
        this.showErrorMessage('Ürün silinirken bir hata oluştu: ' + 
          (err.error?.message || err.message || 'Bilinmeyen hata'));
      }
    });
  }
  
  // Toggle product status (active/inactive)
  toggleProductStatus(product: ExtendedProduct): void {
    const currentStatus = product.status || (product.isActive ? 'active' : 'inactive');
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    this.statusUpdateProcessing = true;
    
    this.productService.updateSellerProductStatus(product.id, newStatus).subscribe({
      next: (updatedProduct) => {
        product.status = updatedProduct.status;
        product.isActive = updatedProduct.status === 'active';
        
        // Update variants status if loaded
        if (product.variants && product.variants.length > 0) {
          product.variants.forEach(variant => {
            variant.status = newStatus;
            variant.active = newStatus === 'active';
          });
        }
        
        // Update selected product details if applicable
        if (this.selectedProduct && this.selectedProduct.id === product.id && this.selectedProduct.variants) {
          this.selectedProduct.variants.forEach(variant => {
            variant.status = newStatus;
            variant.active = newStatus === 'active';
          });
        }
        
        this.statusUpdateProcessing = false;
        this.statusUpdateSuccess = true;
        this.statusUpdateMessage = `Ürün durumu ${newStatus === 'active' ? 'aktif' : 'pasif'} olarak güncellendi`;
        
        setTimeout(() => {
          this.statusUpdateSuccess = false;
          this.statusUpdateMessage = '';
        }, 3000);
      },
      error: (err) => {
        console.error('Error updating product status:', err);
        this.statusUpdateProcessing = false;
        this.statusUpdateSuccess = false;
        this.statusUpdateMessage = 'Ürün durumu güncellenirken bir hata oluştu';
        this.showErrorMessage('Ürün durumu güncellenirken bir hata oluştu');
      }
    });
  }
  
  // View product details
  viewProductDetails(productId: number): void {
    this.productDetailsLoading = true;
    this.selectedProduct = null;
    
    this.productService.getProduct(productId).subscribe({
      next: (product) => {
        this.selectedProduct = product;
        this.productDetailsLoading = false;
        this.showProductDetailsModal = true;
      },
      error: (err) => {
        console.error('Error loading product details:', err);
        this.productDetailsLoading = false;
        this.showErrorMessage('Ürün detayları alınırken bir hata oluştu');
      }
    });
  }
  
  // Close product details modal
  closeProductDetailsModal(): void {
    this.showProductDetailsModal = false;
  }
  
  // Create an empty product object
  private getEmptyProduct(): Partial<ExtendedProduct> {
    return {
      name: '',
      description: '',
      price: 0,
      imageUrl: '',
      categoryId: undefined,
      brand: undefined,
      storeId: this.storeId || '',
      stock: 0,
      rating: 0,
      reviews: 0,
      reviewCount: 0,
      featured: false,
      isActive: true,
      discount: 0,
      slug: '',
      specifications: {}
    };
  }
  
  // Show notification messages
  showSuccessMessage(message: string): void {
    this.snackBar.open(message, 'Tamam', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  showErrorMessage(message: string): void {
    this.snackBar.open(message, 'Tamam', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  showInfoMessage(message: string): void {
    this.snackBar.open(message, 'Tamam', {
      duration: 3000
    });
  }
  
  // Calculate discounted price
  calculateDiscountedPrice(price: number, discount: number | undefined): number {
    if (!discount) return price;
    return price - (price * discount / 100);
  }
  
  // Format category name
  formatCategoryName(category: string | any): string {
    if (!category) return 'Kategorisiz';
    
    if (typeof category === 'string') {
      return category;
    }
    
    if (typeof category === 'object' && category.name) {
      return category.name;
    }
    
    // Find category name by ID
    if (typeof category === 'object' && category.id) {
      const foundCategory = this.categories.find(c => c.id === category.id);
      if (foundCategory) {
        return foundCategory.name;
      }
    }
    
    return 'Kategorisiz';
  }
  
  // Format price
  formatPrice(price: number): string {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(price);
  }
  
  // Preview product in storefront
  previewProduct(product: ExtendedProduct): void {
    window.open(`http://localhost:4200/products/${product.id}`, '_blank');
  }

  

  // Clear filters
  clearFilters(): void {
    this.categoryFilter = '';
    this.stockFilter = 'all';
    this.loadProducts();
  }

  // Get category name by ID
  getCategoryNameById(categoryId: number): string {
    if (!categoryId || !this.categories.length) return 'Kategorisiz';
    
    const category = this.categories.find(c => c.id === categoryId);
    return category ? category.name : 'Kategorisiz';
  }

  // Toggle product variants display
  toggleVariants(product: ExtendedProduct): void {
    product.showVariants = !product.showVariants;
    
    // Load variants if showing and not loaded yet
    if (product.showVariants && (!product.variants || product.variants.length === 0)) {
      this.loadProductVariants(product.id);
    }
  }
  
  // Load product variants
  loadProductVariants(productId: number): void {
    // Find the product in the list
    const product = this.products.find(p => p.id === productId);
    if (!product) {
      console.error('Product not found for loading variants, ID:', productId);
      return;
    }
    
    // Don't reload if variants are already loaded
    if (product.variants && product.variants.length > 0) {
      console.log('Variants already loaded for product:', productId);
      return;
    }
    
    console.log('Loading variants for product:', productId);
    
    this.productService.getSellerProductVariants(productId).subscribe({
      next: (variants) => {
        // Update product variants
        product.variants = variants;
        console.log('Variants loaded successfully:', variants.length, 'variants');
      },
      error: (err) => {
        console.error('Error loading product variants:', err);
        this.showErrorMessage('Varyantlar yüklenirken bir hata oluştu: ' + (err.error?.message || err.message || 'Bilinmeyen hata'));
        // Hide variants section on error
        product.showVariants = false;
      }
    });
  }

  // Format variant attributes
  formatVariantAttributes(attributes: { [key: string]: string } | undefined): string {
    if (!attributes || Object.keys(attributes).length === 0) {
      return 'Özellik yok';
    }

    const formattedAttributes = Object.entries(attributes).map(([key, value]) => {
      // Format key - convert camelCase and underscore to more readable format
      let formattedKey = key
        .replace(/([A-Z])/g, ' $1') // Add space before capital letters
        .replace(/_/g, ' ')         // Replace underscores with spaces
        .trim();
      
      // Capitalize first letter
      formattedKey = formattedKey.charAt(0).toUpperCase() + formattedKey.slice(1);
      
      return `${formattedKey}: ${value}`;
    });

    return formattedAttributes.join(', ');
  }

  // Toggle variant status
  toggleVariantStatus(variant: any, productId: number): void {
    const currentStatus = variant.status || (variant.active ? 'active' : 'inactive');
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    this.statusUpdateProcessing = true;
    console.log('Changing variant status:', variant.id, 'to', newStatus);
    
    this.productService.updateSellerVariantStatus(variant.id, newStatus).subscribe({
      next: (updatedVariant: ProductVariant) => {
        console.log('Variant status updated successfully:', updatedVariant);
        variant.status = updatedVariant.status;
        variant.active = updatedVariant.status === 'active';
        
        // Update product's total stock
        const product = this.products.find(p => p.id === productId);
        if (product) {
          this.updateProductTotalStock(product);
        }
        
        // Update selected product's total stock if open
        if (this.selectedProduct && this.selectedProduct.id === productId) {
          this.updateProductTotalStock(this.selectedProduct);
        }
        
        this.statusUpdateProcessing = false;
        this.statusUpdateSuccess = true;
        this.statusUpdateMessage = `Varyant durumu ${newStatus === 'active' ? 'aktif' : 'pasif'} olarak güncellendi`;
        
        setTimeout(() => {
          this.statusUpdateSuccess = false;
          this.statusUpdateMessage = '';
        }, 3000);
      },
      error: (err: any) => {
        console.error('Error updating variant status:', err);
        this.statusUpdateProcessing = false;
        this.statusUpdateSuccess = false;
        this.statusUpdateMessage = 'Varyant durumu güncellenirken bir hata oluştu';
        this.showErrorMessage('Varyant durumu güncellenirken bir hata oluştu: ' + (err.error?.message || err.message || 'Bilinmeyen hata'));
      }
    });
  }
  
  // Delete variant
  deleteVariant(variantId: number, productId: number): void {
    if (!confirm('Bu varyantı silmek istediğinizden emin misiniz?')) {
      return;
    }
    
    console.log('Deleting variant:', variantId, 'from product:', productId);
    
    this.productService.deleteSellerVariant(variantId).subscribe({
      next: () => {
        console.log('Variant deleted successfully');
        this.showSuccessMessage('Varyant başarıyla silindi');
        
        // Update product's variants list
        const product = this.products.find(p => p.id === productId);
        if (product && product.variants) {
          product.variants = product.variants.filter(v => v.id !== variantId);
          this.updateProductTotalStock(product);
        }
        
        // Update selected product's variants if open
        if (this.selectedProduct && this.selectedProduct.variants) {
          this.selectedProduct.variants = this.selectedProduct.variants.filter(v => v.id !== variantId);
          this.updateProductTotalStock(this.selectedProduct);
        }
      },
      error: (err) => {
        console.error('Error deleting variant:', err);
        this.showErrorMessage('Varyant silinirken bir hata oluştu: ' + (err.error?.message || err.message || 'Bilinmeyen hata'));
      }
    });
  }
  
  // Open edit variant modal
  editVariant(variant: ProductVariant, productId: number): void {
    console.log('Opening edit variant modal for variant:', variant.id, 'product:', productId);
    
    // Deep clone the variant to avoid modifying the original
    this.variantToEdit = { ...JSON.parse(JSON.stringify(variant)) };
    this.currentProductId = productId;
    this.editVariantTitle = `Varyant Düzenle: ${variant.sku}`;
    this.showVariantEditModal = true;
    
    console.log('Variant ready for editing:', this.variantToEdit);
  }
  
  // Close variant edit modal
  closeVariantEditModal(): void {
    this.showVariantEditModal = false;
  }
  
  // Save variant
  saveVariant(): void {
    if (!this.variantToEdit.id) {
      this.showErrorMessage('Varyant ID bulunamadı');
      return;
    }
    
    console.log('Varyant güncelleme öncesi tam varyant bilgisi:', this.variantToEdit);
    
    // Prepare variant object
    const updatedVariant: Partial<ProductVariant> = {
      id: this.variantToEdit.id,
      productId: this.variantToEdit.productId,
      sku: this.variantToEdit.sku,
      price: this.variantToEdit.price || 0,
      salePrice: this.variantToEdit.salePrice,
      stock: this.variantToEdit.stock,
      status: this.variantToEdit.status || 'active',
      active: this.variantToEdit.status === 'active',
      imageUrls: this.variantToEdit.imageUrls,
      attributes: {} // Initialize empty first
    };
    
    // Copy attributes if available
    if (this.variantToEdit.attributes) {
      // Copy all attributes directly
      updatedVariant.attributes = { ...this.variantToEdit.attributes };
      console.log('Varyant özellikleri:', updatedVariant.attributes);
      
      // Add attribute IDs
      updatedVariant.attributesWithIds = [];
      
      for (const key in this.variantToEdit.attributes) {
        if (this.variantToEdit.attributes.hasOwnProperty(key)) {
          const value = this.variantToEdit.attributes[key];
          const attributeId = this.findAttributeIdForKey(key);
          
          updatedVariant.attributesWithIds.push({
            attribute_id: attributeId || 1,
            key: key,
            value: value
          });
        }
      }
      
      // Log attributesWithIds for debugging
      console.log('Güncellenecek attributesWithIds:', updatedVariant.attributesWithIds);
    }
    
    console.log('Güncellenecek varyant:', updatedVariant);
    
    this.productService.updateSellerVariant(this.variantToEdit.id, updatedVariant).subscribe({
      next: (updated) => {
        console.log('Backend\'den dönen güncellenmiş varyant:', updated);
        this.showSuccessMessage('Varyant başarıyla güncellendi');
        this.closeVariantEditModal();
        
        // Update the variant in the product list
        const product = this.products.find(p => p.id === this.currentProductId);
        if (product && product.variants) {
          const index = product.variants.findIndex(v => v.id === updated.id);
          if (index !== -1) {
            product.variants[index] = updated;
          }
          this.updateProductTotalStock(product);
        }
        
        // Update selected product's variant if open
        if (this.selectedProduct && this.selectedProduct.variants) {
          const index = this.selectedProduct.variants.findIndex(v => v.id === updated.id);
          if (index !== -1) {
            this.selectedProduct.variants[index] = updated;
          }
          this.updateProductTotalStock(this.selectedProduct);
        }
      },
      error: (err) => {
        console.error('Error updating variant:', err);
        this.showErrorMessage('Varyant güncellenirken bir hata oluştu: ' + (err.error?.message || err.message || 'Bilinmeyen hata'));
      }
    });
  }
  
  // Update product's total stock
  updateProductTotalStock(product: ExtendedProduct): void {
    if (product.variants && product.variants.length > 0) {
      const totalStock = product.variants.reduce((sum, variant) => sum + (variant.stock || 0), 0);
      const oldStock = product.stock || 0;
      
      console.log('Updating product total stock:', product.id, 'Old:', oldStock, 'New:', totalStock);
      
      product.stock = totalStock;
      product.totalStock = totalStock;
      
      // Update stock in database
      this.productService.updateProductStock(product.id, totalStock).subscribe({
        next: (updatedProduct) => {
          console.log('Product total stock updated successfully:', totalStock);
        },
        error: (err) => {
          console.error('Error updating product total stock:', err);
          // Don't show error to user to avoid confusion, but log it
        }
      });
    } else {
      console.log('No variants found for product:', product.id, 'Stock remains:', product.stock);
    }
  }
  
  // Find attribute ID for a key
  findAttributeIdForKey(key: string): number | null {
    // This is a static mapping of attribute keys to their IDs
    // In a real application, this should come from the backend
    const attributeKeyMap: {[key: string]: number} = {
      'Renk': 4,
      'Beden': 5,
      'Numara': 7,
      'Materyal': 6,
      'Malzeme': 15,
      'Boyut': 17,
      'Desen': 13,
      'Sezon': 14
    };
    
    // Check if the key exists in our map (case insensitive)
    const normalizedKey = key.trim();
    for (const mapKey in attributeKeyMap) {
      if (mapKey.toLowerCase() === normalizedKey.toLowerCase()) {
        return attributeKeyMap[mapKey];
      }
    }
    
    // If not found, return null
    return null;
  }
  
  // Add new attribute
  addAttribute(): void {
    if (!this.variantToEdit.attributes) {
      this.variantToEdit.attributes = {};
    }
    
    const key = prompt('Özellik adı:');
    if (key && key.trim() !== '') {
      const value = prompt(`"${key}" için değer:`);
      if (value && value.trim() !== '') {
        this.variantToEdit.attributes![key.trim()] = value.trim();
      }
    }
  }
  
  // Edit attribute
  editAttribute(key: string): void {
    if (!this.variantToEdit.attributes) {
      return;
    }
    
    const newValue = prompt(`"${key}" için yeni değer:`, this.variantToEdit.attributes[key]);
    if (newValue !== null) {
      this.variantToEdit.attributes[key] = newValue;
    }
  }
  
  // Remove attribute
  removeAttribute(key: string): void {
    if (!this.variantToEdit.attributes) {
      return;
    }
    
    if (confirm(`"${key}" özelliğini silmek istediğinizden emin misiniz?`)) {
      delete this.variantToEdit.attributes[key];
    }
  }

  // Show attribute form
  showAttributeForm(): void {
    this.showAddAttributeForm = true;
    this.newAttributeKey = '';
    this.newAttributeValue = '';
  }
  
  // Cancel adding attribute
  cancelAddAttribute(): void {
    this.showAddAttributeForm = false;
    this.newAttributeKey = '';
    this.newAttributeValue = '';
  }
  
  // Confirm adding attribute
  confirmAddAttribute(): void {
    if (!this.newAttributeKey || !this.newAttributeValue) {
      return;
    }
    
    if (!this.variantToEdit.attributes) {
      this.variantToEdit.attributes = {};
    }
    
    // Check if attribute with same name exists
    if (this.variantToEdit.attributes[this.newAttributeKey]) {
      if (!confirm(`"${this.newAttributeKey}" özelliği zaten var. Üzerine yazmak istiyor musunuz?`)) {
        return;
      }
    }
    
    this.variantToEdit.attributes[this.newAttributeKey] = this.newAttributeValue;
    this.showAddAttributeForm = false;
    this.newAttributeKey = '';
    this.newAttributeValue = '';
  }
  
  // Select color
  selectColor(attributeKey: string, colorName: string): void {
    if (!this.variantToEdit.attributes) {
      this.variantToEdit.attributes = {};
    }
    
    this.variantToEdit.attributes[attributeKey] = colorName;
  }
  
  // Select color with code
  selectColorWithCode(attributeKey: string, colorName: string, colorCode: string): void {
    if (!this.variantToEdit.attributes) {
      this.variantToEdit.attributes = {};
    }
    
    this.variantToEdit.attributes[attributeKey] = colorName;
    
    if (this.variantToEdit.attributes.hasOwnProperty('RenkKodu')) {
      this.variantToEdit.attributes['RenkKodu'] = colorCode;
    } else {
      this.variantToEdit.attributes['RenkKodu'] = colorCode;
    }
  }
  
  // Select size
  selectSize(attributeKey: string, size: string): void {
    if (!this.variantToEdit.attributes) {
      this.variantToEdit.attributes = {};
    }
    
    this.variantToEdit.attributes[attributeKey] = size;
  }
  
  // Check if color is light or dark
  isLightColor(hexColor: string): boolean {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate brightness using YIQ formula
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    
    return brightness > 128;
  }
  
  // Go back to store dashboard
  goBack(): void {
    if (this.storeId) {
      // Navigate back to dashboard with this store selected
      this.router.navigate(['/seller/dashboard'], { 
        queryParams: { selectedStore: this.storeId }
      });
    } else {
      // Navigate back to dashboard with all stores view
      this.router.navigate(['/seller/dashboard']);
    }
  }
  
  // Helper method for variant attributes - get count
  getAttributeCount(): number {
    return this.variantToEdit.attributes ? Object.keys(this.variantToEdit.attributes).length : 0;
  }
  
  // Helper method for variant attributes - get as array
  getAttributesArray(): {key: string, value: string}[] {
    if (!this.variantToEdit.attributes) return [];
    return Object.entries(this.variantToEdit.attributes).map(([key, value]) => ({ key, value }));
  }
  
  // Helper method for comparing brands in select
  compareBrands(b1: Brand, b2: Brand): boolean {
    return b1 && b2 && b1.id === b2.id;
  }

  // Logout method
  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.showSuccessMessage('Başarıyla çıkış yapıldı');
        // Redirect to login page
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Çıkış yaparken hata oluştu:', err);
        this.showErrorMessage('Çıkış yapılırken bir hata oluştu');
      }
    });
  }
}
