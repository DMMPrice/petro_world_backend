import { pool } from '../config/database';

interface OrderItemInput {
  productId: string;
  quantity: number;
  price: number; // client-reported price
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  subtotal: number;
  couponDiscount: number;
  total: number;
  verifiedItems: {
    productId: string;
    quantity: number;
    price: number; // server-calculated price
  }[];
}

export async function validateOrderPricing(
  items: OrderItemInput[],
  couponId: string | null | undefined,
  clientTotal: number,
  clientCouponDiscount: number
): Promise<ValidationResult> {
  if (!Array.isArray(items) || items.length === 0) {
    return { valid: false, error: 'Items list is empty or invalid', subtotal: 0, couponDiscount: 0, total: 0, verifiedItems: [] };
  }

  let subtotal = 0;
  const verifiedItems: { productId: string; quantity: number; price: number }[] = [];

  for (const item of items) {
    if (!item.productId || !item.quantity || item.quantity <= 0) {
      return { valid: false, error: 'Invalid product ID or quantity', subtotal: 0, couponDiscount: 0, total: 0, verifiedItems: [] };
    }

    // Query product details from database
    const { rows } = await pool.query(
      'SELECT id, price, price_after_discount, stock_quantity FROM products WHERE id = $1',
      [item.productId]
    );

    if (rows.length === 0) {
      return { valid: false, error: `Product with ID ${item.productId} not found`, subtotal: 0, couponDiscount: 0, total: 0, verifiedItems: [] };
    }

    const product = rows[0];
    if (product.stock_quantity < item.quantity) {
      return { valid: false, error: `Insufficient stock for product ID ${item.productId} (requested: ${item.quantity}, stock: ${product.stock_quantity})`, subtotal: 0, couponDiscount: 0, total: 0, verifiedItems: [] };
    }

    // Calculate active unit price: use price_after_discount if lower than base price
    const originalPrice = parseFloat(product.price);
    const discountPrice = product.price_after_discount ? parseFloat(product.price_after_discount) : null;
    const unitPrice = discountPrice !== null && discountPrice < originalPrice ? discountPrice : originalPrice;

    subtotal += unitPrice * item.quantity;
    verifiedItems.push({
      productId: item.productId,
      quantity: item.quantity,
      price: unitPrice,
    });
  }

  let calculatedCouponDiscount = 0;

  if (couponId) {
    const { rows: couponRows } = await pool.query(
      'SELECT id, discount_type, discount_value, active, expiry, min_order_value FROM coupons WHERE id = $1',
      [couponId]
    );

    if (couponRows.length > 0) {
      const coupon = couponRows[0];
      const now = new Date();
      const expiry = new Date(coupon.expiry);

      if (coupon.active && expiry > now && subtotal >= parseFloat(coupon.min_order_value)) {
        const discountValue = parseFloat(coupon.discount_value);
        if (coupon.discount_type === 'percentage') {
          calculatedCouponDiscount = subtotal * (discountValue / 100);
        } else {
          calculatedCouponDiscount = discountValue;
        }
        // Limit discount to the subtotal amount
        if (calculatedCouponDiscount > subtotal) {
          calculatedCouponDiscount = subtotal;
        }
      }
    }
  }

  // Query shipping settings from database
  const { rows: settingsRows } = await pool.query(
    "SELECT key, value FROM settings WHERE key IN ('shipping_fee', 'shipping_threshold')"
  );

  let shippingFee = 0;
  const shippingFeeSetting = settingsRows.find((r: { key: string }) => r.key === 'shipping_fee');
  const shippingThresholdSetting = settingsRows.find((r: { key: string }) => r.key === 'shipping_threshold');

  const fee = shippingFeeSetting ? parseFloat(shippingFeeSetting.value as string) : 50;
  const threshold = shippingThresholdSetting ? parseFloat(shippingThresholdSetting.value as string) : 999;

  if (subtotal < threshold) {
    shippingFee = fee;
  }

  const calculatedTotal = Math.max(0, subtotal - calculatedCouponDiscount + shippingFee);

  // Compare with client-provided totals (with a 0.05 tolerance for floating-point precision differences)
  const totalDifference = Math.abs(calculatedTotal - clientTotal);
  const discountDifference = Math.abs(calculatedCouponDiscount - clientCouponDiscount);

  if (totalDifference > 0.05) {
    return {
      valid: false,
      error: `Price validation failed: Calculated total is ${calculatedTotal.toFixed(2)}, but client sent ${clientTotal.toFixed(2)}`,
      subtotal,
      couponDiscount: calculatedCouponDiscount,
      total: calculatedTotal,
      verifiedItems,
    };
  }

  if (discountDifference > 0.05) {
    return {
      valid: false,
      error: `Discount validation failed: Calculated discount is ${calculatedCouponDiscount.toFixed(2)}, but client sent ${clientCouponDiscount.toFixed(2)}`,
      subtotal,
      couponDiscount: calculatedCouponDiscount,
      total: calculatedTotal,
      verifiedItems,
    };
  }

  return {
    valid: true,
    subtotal,
    couponDiscount: calculatedCouponDiscount,
    total: calculatedTotal,
    verifiedItems,
  };
}
