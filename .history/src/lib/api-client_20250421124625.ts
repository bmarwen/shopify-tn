// src/lib/api-client.ts
/**
 * API Client for making API calls to the backend
 */
export const apiClient = {
  /**
   * Make a GET request to the API
   */
  async get(endpoint: string, params: Record<string, any> = {}) {
    // Build URL with query parameters
    const url = new URL(`/api${endpoint}`, window.location.origin);

    // Add query parameters to URL
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.append(key, String(value));
      }
    });

    // Make request
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "An error occurred");
    }

    return response.json();
  },

  /**
   * Make a POST request to the API
   */
  async post(endpoint: string, data: any) {
    const response = await fetch(`/api${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "An error occurred");
    }

    return response.json();
  },

  /**
   * Make a PUT request to the API
   */
  async put(endpoint: string, data: any) {
    const response = await fetch(`/api${endpoint}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "An error occurred");
    }

    return response.json();
  },

  /**
   * Make a DELETE request to the API
   */
  async delete(endpoint: string) {
    const response = await fetch(`/api${endpoint}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "An error occurred");
    }

    return response.json();
  },

  // Products API
  products: {
    /**
     * Get products with filtering, sorting, and pagination
     */
    async getProducts(params: any = {}) {
      return apiClient.get("/products", params);
    },

    /**
     * Create a new product
     */
    async createProduct(data: any) {
      return apiClient.post("/products", data);
    },

    /**
     * Get a product by ID
     */
    async getProduct(id: string) {
      return apiClient.get(`/products/${id}`);
    },

    /**
     * Update a product
     */
    async updateProduct(id: string, data: any) {
      return apiClient.put(`/products/${id}`, data);
    },

    /**
     * Delete a product
     */
    async deleteProduct(id: string) {
      return apiClient.delete(`/products/${id}`);
    },
  },

  // Categories API
  categories: {
    /**
     * Get all categories
     */
    async getCategories() {
      return apiClient.get("/categories");
    },
  },

  // Shop API
  shop: {
    /**
     * Get shop information
     */
    async getShopInfo() {
      return apiClient.get("/shop");
    },
  },
};
