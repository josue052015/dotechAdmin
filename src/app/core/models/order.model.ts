export interface Order {
    id?: string; // Implicitly the row number or a generated UUID
    date: string;
    fullName: string;
    phone: string;
    address1: string;
    province: string;
    city: string;
    productName: string;
    productQuantity: number;
    productPrice: number;
    shippingCost: number;
    packaging: number;
    carrier?: string;
    status: string;
    notes: string;
    isDeleted?: boolean;
    [key: string]: any;
}
