import {Search, Scan} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {useToast} from "@/components/ui/use-toast";
import {getImageUrl} from "@/lib/utils";
import {Product} from "../pos-system";

interface ProductSearchProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    searchResults: Product[];
    setSearchResults: (results: Product[]) => void;
    isSearching: boolean;
    setIsSearching: (searching: boolean) => void;
    selectedVariants: Record<string, string>;
    setSelectedVariants: (variants: (prev) => any) => void;
    addToCart: (product: Product, variantId?: string) => void;
}

export default function ProductSearch({
                                          searchQuery,
                                          setSearchQuery,
                                          searchResults,
                                          setSearchResults,
                                          isSearching,
                                          setIsSearching,
                                          selectedVariants,
                                          setSelectedVariants,
                                          addToCart,
                                      }: ProductSearchProps) {
    const {toast} = useToast();

    // Search products
    const searchProducts = async (query: string, isBarcode = false) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const params = new URLSearchParams();
            if (isBarcode) {
                params.append("barcode", query);
            } else {
                params.append("query", query);
            }

            const response = await fetch(`/api/pos/products?${params}`);
            const data = await response.json();

            if (data.products) {
                setSearchResults(data.products);

                // If it's a barcode search and we found exactly one product, add it to cart
                if (isBarcode && data.products.length === 1) {
                    addToCart(data.products[0]);
                    setSearchQuery("");
                    setSearchResults([]);
                }
            }
        } catch (error) {
            console.error("Error searching products:", error);
            toast({
                title: "Search Error",
                description: "Failed to search products",
                variant: "destructive",
            });
        } finally {
            setIsSearching(false);
        }
    };

    // Handle barcode scan (Enter key in search)
    const handleSearchKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            const query = searchQuery.trim();
            if (query) {
                // If it looks like a barcode (numbers only and length >= 8), treat as barcode
                const isBarcode = /^\d{8,}$/.test(query);
                searchProducts(query, isBarcode);
            }
        }
    };

    return (
        <>
            <style jsx>{`
                [data-state="checked"] > div > svg {
                    display: none !important;
                }
            `}</style>
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-6 mb-6">
                <div className="flex gap-4">
                    <div className="flex-1">
                        <Label htmlFor="search" className="text-slate-700 font-semibold text-sm">
                            Search Products (Name, SKU, Barcode)
                        </Label>
                        <div className="relative mt-2">
                            <Search
                                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4"/>
                            <Input
                                id="search"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    // Only search after 3+ characters or if it's empty (to clear results)
                                    if (e.target.value.length >= 3 || e.target.value.length === 0) {
                                        searchProducts(e.target.value);
                                    }
                                }}
                                onKeyPress={handleSearchKeyPress}
                                placeholder="Search or scan barcode... (min 3 characters)"
                                className="pl-10 bg-white border-slate-300 text-gray-300 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <Button
                        onClick={() => searchProducts(searchQuery)}
                        disabled={isSearching}
                        className="mt-8 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        <Scan className="h-4 w-4 mr-2"/>
                        Search
                    </Button>
                </div>

                {/* Search Results */}
                {isSearching ? (
                    // Loading spinner
                    <div className="mt-4 border border-slate-200 rounded-lg bg-white p-12">
                        <div className="flex flex-col items-center justify-center">
                            <div className="relative">
                                <div
                                    className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                                <div
                                    className="absolute inset-0 w-12 h-12 border-4 border-transparent border-r-blue-400 rounded-full animate-spin"
                                    style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
                            </div>
                            <p className="mt-4 text-slate-600 font-medium">Searching products...</p>
                            <p className="text-sm text-slate-400">Please wait while we find the best matches</p>
                        </div>
                    </div>
                ) : searchQuery.length >= 3 && searchResults.length === 0 ? (
                    // No results found
                    <div className="mt-4 border border-slate-200 rounded-lg bg-white p-12">
                        <div className="flex flex-col items-center justify-center">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor"
                                         viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-3-3v6m-5 2a9 9 0 1118 0 9 9 0 01-18 0z"/>
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900">No products found</h3>
                            </div>
                            <p className="text-slate-600 text-center mb-4">We couldn't find any products matching <span
                                className="font-medium">'{searchQuery}'</span></p>
                            <div className="text-sm text-slate-500 bg-slate-50 rounded-lg p-3 max-w-md">
                                <p className="font-medium mb-2">Try:</p>
                                <ul className="space-y-1">
                                    <li>• Checking your spelling</li>
                                    <li>• Using different keywords</li>
                                    <li>• Searching by SKU or barcode</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                ) : searchResults.length > 0 ? (
                    <div className="mt-4 border border-slate-200 rounded-lg max-h-64 overflow-y-auto bg-white">
                        {searchResults.map((product) => (
                            <div key={product.id} className="border-b border-slate-100 last:border-b-0">
                                <div
                                    className="flex items-center justify-between p-3 hover:bg-blue-50 transition-colors">
                                    <div className="flex items-center gap-3 flex-1">
                                        {product.images[0] && (
                                            <img
                                                src={getImageUrl(product.images[0])}
                                                alt={product.name}
                                                className="w-12 h-12 object-cover object-center rounded border border-slate-200"
                                                onError={(e) => {
                                                    e.currentTarget.src = '/images/placeholder.svg';
                                                }}
                                            />
                                        )}
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-slate-900">{product.name}</h4>
                                            <p className="text-sm text-slate-600">
                                                {product.sku && `SKU: ${product.sku} | `}
                                                {product.variants.length > 0
                                                    ? `${product.variants.length} variants`
                                                    : `Stock: ${product.inventory || 0}`
                                                }
                                            </p>
                                            {product.discounts && product.discounts.length > 0 && (
                                                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                        {product.discountPercentage}% OFF
                      </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {/* Variant Selection - Compact Design */}
                                        {product.variants && product.variants.length > 0 ? (
                                            <div className="flex flex-col items-end gap-2">
                                                <Select
                                                    value={selectedVariants[product.id] || ""}
                                                    onValueChange={(variantId: string) => {
                                                        setSelectedVariants((prev) => ({
                                                            ...prev,
                                                            [product.id]: variantId
                                                        }));
                                                    }}
                                                >
                                                    <SelectTrigger
                                                        className="w-72 h-10 bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700 transition-colors px-4">
                                                        <SelectValue placeholder="Select variant">
                                                            {selectedVariants[product.id] && (() => {
                                                                const selectedVariant = product.variants.find(v => v.id === selectedVariants[product.id]);
                                                                if (selectedVariant) {
                                                                    return (
                                                                        <div
                                                                            className="flex items-center justify-between w-full text-left">
                                                                            <div className="flex flex-col">
                                                                                <div className="flex items-center">
                                                                                    <span className="font-medium text-sm text-slate-200">
                                                                                      {selectedVariant.name}
                                                                                    </span>
                                                                                </div>
                                                                                <div
                                                                                    className="flex items-center text-xs text-slate-400">
                                                                                    {selectedVariant.hasDiscount ? (
                                                                                        <>
                                                                                            <span
                                                                                                className="line-through text-slate-500 mr-2">{selectedVariant.price.toFixed(2)} DT</span>
                                                                                            <span
                                                                                                className="font-semibold text-green-400">{(selectedVariant.finalPrice || selectedVariant.price).toFixed(2)} DT</span>
                                                                                        </>
                                                                                    ) : (
                                                                                        <span
                                                                                            className="font-medium text-slate-300">{selectedVariant.price.toFixed(2)} DT</span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                }
                                                                return null;
                                                            })()}
                                                        </SelectValue>
                                                    </SelectTrigger>
                                                    <SelectContent
                                                        className="bg-slate-800 border-slate-600 w-72 max-h-80 z-50">
                                                        {product.variants.map((variant) => (
                                                            <SelectItem
                                                                key={variant.id}
                                                                value={variant.id}
                                                                className="relative pr-3 pl-3 py-2 cursor-pointer text-slate-200 data-[highlighted]:bg-slate-700 data-[highlighted]:text-slate-100 [&_[data-select-item-indicator]]:hidden"
                                                            >
                                                                <div className="flex flex-col">
                                                                    <div className="flex items-center space-x-2 pl-5">
                                                                      <span className="font-medium text-sm text-slate-200">
                                                                        {variant.name}
                                                                          {variant.hasDiscount && (
                                                                              <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded ml-2 font-medium">
                                                                            -{variant.discountPercentage}%
                                                                          </span>
                                                                          )}
                                                                      </span>
                                                                    </div>
                                                                    <div className="text-xs text-slate-400 pl-5">
                                                                        {variant.inventory} left
                                                                    </div>
                                                                </div>

                                                                {/* Absolutely positioned price to the right */}
                                                                <div
                                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-right min-w-[100px]">
                                                                    {variant.hasDiscount ? (
                                                                        <>
                                                                            <div
                                                                                className="text-sm line-through text-slate-500">
                                                                                {variant.price.toFixed(2)} DT
                                                                            </div>
                                                                            <div
                                                                                className="text-sm font-bold text-green-400">
                                                                                {(variant.finalPrice || variant.price).toFixed(2)} DT
                                                                            </div>
                                                                        </>
                                                                    ) : (
                                                                        <div
                                                                            className="text-sm font-semibold text-slate-300">
                                                                            {variant.price.toFixed(2)} DT
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <span className="hidden" data-state="checked" />

                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        const selectedVariantId = selectedVariants[product.id];
                                                        if (selectedVariantId) {
                                                            addToCart(product, selectedVariantId);
                                                        } else {
                                                            toast({
                                                                title: "Please select a variant",
                                                                description: "Choose a variant before adding to cart",
                                                                variant: "destructive",
                                                            });
                                                        }
                                                    }}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-sm h-8"
                                                    disabled={!selectedVariants[product.id]}
                                                >
                                                    Add to Cart
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button
                                                size="sm"
                                                onClick={() => addToCart(product)}
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
                                            >
                                                Add to Cart
                                            </Button>
                                        )}

                                        <div className="text-right min-w-[120px]">
                                            {(() => {
                                                const selectedVariantId = selectedVariants[product.id];
                                                const selectedVariant = selectedVariantId
                                                    ? product.variants.find(v => v.id === selectedVariantId)
                                                    : null;

                                                if (selectedVariant) {
                                                    // Show selected variant price
                                                    return (
                                                        <>
                                                            {selectedVariant.hasDiscount ? (
                                                                <>
                                                                    <p className="text-sm line-through text-gray-500">
                                                                        {selectedVariant.price.toFixed(2)} DT
                                                                    </p>
                                                                    <p className="font-bold text-base text-slate-900">
                                                                        {(selectedVariant.finalPrice || selectedVariant.price).toFixed(2)} DT
                                                                    </p>
                                                                    <p className="text-xs text-green-600 font-medium">
                                                                        Save {((selectedVariant.price - (selectedVariant.finalPrice || selectedVariant.price))).toFixed(2)} DT
                                                                    </p>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <p className="font-bold text-base text-slate-900">
                                                                        {selectedVariant.price.toFixed(2)} DT
                                                                    </p>
                                                                </>
                                                            )}
                                                        </>
                                                    );
                                                } else if (product.variants.length > 0) {
                                                    // Show price range for variants
                                                    const prices = product.variants.map(v => v.finalPrice || v.price);
                                                    const minPrice = Math.min(...prices);
                                                    const maxPrice = Math.max(...prices);

                                                    return (
                                                        <>
                                                            <p className="font-bold text-base text-slate-900">
                                                                {minPrice === maxPrice
                                                                    ? `${minPrice.toFixed(2)} DT`
                                                                    : `${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)} DT`
                                                                }
                                                            </p>
                                                            <p className="text-xs text-slate-500">
                                                                Price range
                                                            </p>
                                                        </>
                                                    );
                                                } else {
                                                    // No variants - this shouldn't happen in the new structure
                                                    return (
                                                        <>
                                                            <p className="font-bold text-base text-slate-900">
                                                                No variants
                                                            </p>
                                                        </>
                                                    );
                                                }
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>
        </>
    );
}
