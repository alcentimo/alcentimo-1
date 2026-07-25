export interface OnboardingWelcomeInput {
  storeName: string;
  rubroLabel: string;
}

export interface OnboardingSampleProductDraft {
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  categoria: string;
}

export interface OnboardingSampleProductsResult {
  intro: string;
  products: OnboardingSampleProductDraft[];
}
