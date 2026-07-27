"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface CheckoutErrorBoundaryProps {
  children: ReactNode;
  onClose: () => void;
  onRetry?: () => void;
}

interface CheckoutErrorBoundaryState {
  hasError: boolean;
}

export class CheckoutErrorBoundary extends Component<
  CheckoutErrorBoundaryProps,
  CheckoutErrorBoundaryState
> {
  state: CheckoutErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): CheckoutErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[CheckoutErrorBoundary]", error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
    this.props.onRetry?.();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="txn-checkout">
        <header className="txn-checkout-header">
          <div>
            <h2 className="txn-checkout-title">No pudimos abrir el checkout</h2>
            <p className="txn-checkout-subtitle">
              Hubo un problema al cargar el formulario de pedido.
            </p>
          </div>
        </header>
        <div className="txn-checkout-empty">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Puedes cerrar el carrito e intentar de nuevo. Si el problema
            continúa, vacía el carrito y vuelve a agregar los productos.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={this.handleRetry}
              className="txn-submit-btn"
            >
              Reintentar
            </button>
            <button
              type="button"
              onClick={this.props.onClose}
              className="txn-whatsapp-outline-btn"
            >
              Cerrar carrito
            </button>
          </div>
        </div>
      </div>
    );
  }
}
