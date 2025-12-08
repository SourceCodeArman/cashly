export interface TransactionSplit {
    split_id: string;
    category: string;
    category_name: string;
    category_icon: string;
    category_color: string;
    amount: string;
    description: string;
    created_at: string;
}

export interface Receipt {
    receipt_id: string;
    transaction: string;
    file: string;
    file_url: string;
    file_name: string;
    file_size: number;
    content_type: string;
    uploaded_at: string;
}

export interface TransactionWithSplits {
    transaction_id: string;
    merchant_name: string;
    description: string;
    amount: string;
    formatted_amount: string;
    date: string;
    category: string | null;
    category_name: string | null;
    splits: TransactionSplit[];
    receipts: Receipt[];
    notes: string;
    created_at: string;
}

export interface CreateSplitRequest {
    transaction: string;
    category: string;
    amount: string;
    description?: string;
}

export interface BulkCreateSplitsRequest {
    transaction_id: string;
    splits: {
        category: string;
        amount: string;
        description?: string;
    }[];
}
