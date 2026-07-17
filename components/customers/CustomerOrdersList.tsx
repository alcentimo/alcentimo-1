import { OrderEstadoPill } from "@/components/dashboard/orders/OrderEstadoPill";
import { formatUsd } from "@/lib/format";
import {
  formatCustomerOrderDate,
  formatCustomerOrderPublicId,
  type CustomerOrderSummary,
} from "@/lib/customers/get-customer-orders";

interface CustomerOrdersListProps {
  orders: CustomerOrderSummary[];
}

export function CustomerOrdersList({ orders }: CustomerOrdersListProps) {
  if (orders.length === 0) {
    return (
      <p className="customer-orders-empty">
        Aún no has realizado pedidos en esta tienda.
      </p>
    );
  }

  return (
    <ul className="customer-orders-list">
      {orders.map((order) => (
        <li key={order.id} className="customer-orders-item">
          <div className="customer-orders-item-main">
            <p className="customer-orders-id">
              {formatCustomerOrderPublicId(order.id)}
            </p>
            <p className="customer-orders-date">
              {formatCustomerOrderDate(order.created_at)}
            </p>
          </div>
          <div className="customer-orders-item-meta">
            <p className="customer-orders-total">{formatUsd(order.total_usd)}</p>
            <OrderEstadoPill estado={order.estado} />
          </div>
        </li>
      ))}
    </ul>
  );
}
