import React, { createContext, useState, useEffect, useContext } from 'react';
import { CheckCircle2, ShoppingBag, X } from 'lucide-react';

const CartContext = createContext(null);

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);

  // Load cart items from localStorage on mount
  useEffect(() => {
    const storedCart = localStorage.getItem('cart');
    if (storedCart) {
      try {
        setCartItems(JSON.parse(storedCart));
      } catch (e) {
        localStorage.removeItem('cart');
      }
    }

    const storedWishlist = localStorage.getItem('wishlist');
    if (storedWishlist) {
      try {
        setWishlist(JSON.parse(storedWishlist));
      } catch (e) {
        localStorage.removeItem('wishlist');
      }
    }
  }, []);

  // Save cart items to localStorage on change
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);

  // Save wishlist to localStorage on change
  useEffect(() => {
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  const toggleWishlist = (product) => {
    setWishlist((prev) => {
      const exists = prev.some((item) => String(item.id) === String(product.id));
      if (exists) {
        return prev.filter((item) => String(item.id) !== String(product.id));
      } else {
        return [...prev, product];
      }
    });
  };

  const isInWishlist = (productId) => {
    return wishlist.some((item) => String(item.id) === String(productId));
  };

  const addToCart = (product, quantity = 1, selectedSpec = null) => {
    if (!product) return;
    setCartItems((prevItems) => {
      const existingIndex = prevItems.findIndex(
        (item) => item.product.id === product.id && JSON.stringify(item.selectedSpec) === JSON.stringify(selectedSpec)
      );

      if (existingIndex > -1) {
        const newItems = [...prevItems];
        newItems[existingIndex].quantity += quantity;
        return newItems;
      } else {
        return [...prevItems, { product, quantity, selectedSpec }];
      }
    });

    // Trigger Toast Notification Popup
    setToastMessage({
      name: product.name || product.productName || 'Sản phẩm',
      price: product.price ? Number(product.price).toLocaleString('vi-VN') + ' ₫' : '',
      quantity
    });

    setTimeout(() => {
      setToastMessage(null);
    }, 3800);
  };

  const removeFromCart = (productId, selectedSpec = null) => {
    setCartItems((prevItems) =>
      prevItems.filter(
        (item) => !(item.product.id === productId && JSON.stringify(item.selectedSpec) === JSON.stringify(selectedSpec))
      )
    );
  };

  const updateQuantity = (productId, quantity, selectedSpec = null) => {
    if (quantity <= 0) {
      removeFromCart(productId, selectedSpec);
      return;
    }
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.product.id === productId && JSON.stringify(item.selectedSpec) === JSON.stringify(selectedSpec)
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  
  const cartTotal = cartItems.reduce((sum, item) => {
    const price = item.product.price || 0;
    return sum + price * item.quantity;
  }, 0);

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartCount,
    cartTotal,
    wishlist,
    toggleWishlist,
    isInWishlist,
  };

  return (
    <CartContext.Provider value={value}>
      {children}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '90px',
          right: '24px',
          zIndex: 999999,
          backgroundColor: '#ffffff',
          border: '1px solid #16a34a',
          borderRadius: '16px',
          padding: '0.875rem 1.15rem',
          boxShadow: '0 15px 35px rgba(22, 163, 74, 0.2), 0 4px 12px rgba(0, 0, 0, 0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem',
          maxWidth: '380px',
          animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            backgroundColor: '#dcfce7',
            border: '1px solid #bbf7d0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <CheckCircle2 size={22} style={{ color: '#16a34a' }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#15803d', fontWeight: 800, fontSize: '0.85rem' }}>
              <ShoppingBag size={14} />
              <span>Đã thêm vào giỏ hàng!</span>
            </div>
            <div style={{ color: '#0f172a', fontWeight: 700, fontSize: '0.825rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
              {toastMessage.name}
            </div>
            {toastMessage.price && (
              <div style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.75rem', marginTop: '1px' }}>
                {toastMessage.price} {toastMessage.quantity > 1 ? `(x${toastMessage.quantity})` : ''}
              </div>
            )}
          </div>

          <button
            onClick={() => setToastMessage(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%'
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </CartContext.Provider>
  );
};
