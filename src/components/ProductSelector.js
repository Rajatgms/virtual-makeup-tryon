import React from 'react';
import { products } from '../data/products';

const ProductSelector = ({ selectedProduct, onSelectProduct }) => {
  return (
      <div className="product-selector">
        <h3>Select a Lipstick</h3>
        <div className="product-list">
          {products.map(product => (
              <div
                  key={product.id}
                  className={`product-item ${selectedProduct?.id === product.id ? 'selected' : ''}`}
                  onClick={() => onSelectProduct(product)}
              >
                <div
                    style={{
                      backgroundColor: product.color,
                      width: '50px',
                      height: '50px',
                      borderRadius: '25px',
                      marginBottom: '8px'
                    }}
                />
                <div>{product.brand}</div>
                <div style={{ fontSize: '12px' }}>{product.name}</div>
              </div>
          ))}
        </div>
      </div>
  );
};

export default ProductSelector;
