import { SUPPLIER_API_ACCESS_METADATA } from "../shared/supplierApiAccess";

/**
 * Returns only credential configuration state. Live secret values never leave
 * the server and are intentionally not copied, logged, rendered, or returned.
 */
export function getSafeSupplierApiAccessStatus() {
  return SUPPLIER_API_ACCESS_METADATA.map((supplier) => ({
    key: supplier.key,
    credentials: supplier.credentials.map((credential) => ({
      label: credential.label,
      reference: credential.reference,
      configured: credential.environmentKeys.some((key) => Boolean(process.env[key])),
    })),
  }));
}
