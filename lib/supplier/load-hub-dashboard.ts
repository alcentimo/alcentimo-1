import { listSupplierProducts } from "@/lib/supplier/actions";
import { listSupplierOrders } from "@/lib/supplier/order-actions";
import { getSupplierPaymentConfig } from "@/lib/supplier/payment-actions";
import { defaultSupplierPaymentConfig } from "@/lib/supplier/payment-types";
import { listMySupplierPayoutObligations } from "@/lib/dropship/get-supplier-payouts";

export async function loadSupplierHubDashboard() {
  const [listedProducts, listedOrders, paymentConfigResult, payoutsResult] =
    await Promise.all([
      listSupplierProducts(),
      listSupplierOrders(),
      getSupplierPaymentConfig(),
      listMySupplierPayoutObligations(),
    ]);

  return {
    products: listedProducts.products ?? [],
    productsError: listedProducts.error ?? null,
    orders: listedOrders.orders ?? [],
    ordersError: listedOrders.error ?? null,
    paymentConfig: paymentConfigResult.config ?? defaultSupplierPaymentConfig(),
    paymentConfigError: paymentConfigResult.error ?? null,
    payouts: payoutsResult.payouts ?? [],
    creditedBalanceUsd: payoutsResult.creditedBalanceUsd ?? 0,
    payoutsError: payoutsResult.error ?? null,
  };
}
