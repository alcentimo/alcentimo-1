export type ImproveProductCopyFocus = "title" | "description" | "all";

export interface ImproveProductCopyInput {
  draftTitle?: string;
  draftDescription?: string;
  storeRubro?: string | null;
  categoryLabel?: string | null;
  focus?: ImproveProductCopyFocus;
}

export interface ImproveProductCopyResult {
  title: string;
  shortDescription: string;
  description: string;
}
