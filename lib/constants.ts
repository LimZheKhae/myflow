// Global constants for merchants and currencies
// Used across the application for consistency

export const MERCHANTS = [
    'Beta',
    'Seed',
    'Maple',
    'Alpha',
    'Tesla',
    'Other'
] as const

export const CURRENCIES = [
    'MYR',
    'SGD',
    'IDR',
    'KHUSD',
    'VND',
    'THB',
    'PHP',
    'INT',
    'Tesla',
    'Other'
] as const

export type Merchant = typeof MERCHANTS[number]
export type Currency = typeof CURRENCIES[number]

// Helper functions for validation
export const isValidMerchant = (merchant: string): merchant is Merchant => {
    return MERCHANTS.includes(merchant as Merchant)
}

export const isValidCurrency = (currency: string): currency is Currency => {
    return CURRENCIES.includes(currency as Currency)
}

