export type Currency = 'COP' | 'USD';
export type Channel = 'Constructora' | 'Distribuidor' | 'Retail';

export interface Product {
    sap_code: string;
    description: string;
    list_price: number;
    category: string;
    currency: Currency;
    image_url?: string;
}

export interface Component {
    code: string;
    description: string;
    level: number;
    quantity: number;
    unit_cost_sap: number;
    unit_cost_real?: number; // Override from JSON
    unit_measure: string;
}

export interface BusinessHeader {
    client: string;
    project: string;
    contact: string;
    advisor: string;
    email: string;
    date: string;
}

export interface LineItem {
    id: string; // uuid
    product: Product;
    quantity: number;
    discount_opt: number; // Percentage 0-100
    target_margin_opt?: number; // Optional target margin %

    // Computed values
    unit_mp_cost: number;
    net_price: number;
    line_margin_pct: number;
    line_margin_val: number;
    status: 'Draft' | 'LowMargin' | 'OK';
}

export interface Scenario {
    id: string;
    header: BusinessHeader;
    channel: Channel;
    currency: Currency;
    trm: number; // Exchange rate (1 for COP)
    lines: LineItem[];

    // Totals
    total_revenue: number;
    total_mp_cost: number;
    total_margin_val: number;
    total_margin_pct: number;

    created_at: string;
    updated_at: string;
}

export interface ComponentCostOverride {
    code: string;
    cost_real: number;
    updated_at: string;
}
