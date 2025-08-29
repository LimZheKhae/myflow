export interface MemberProfile {
    memberId: number
    memberLogin: string
    memberName: string
    birthday: string | null
    registrationDate: Date | null
    lastLoginDate: Date | null
    currency: string | null
    memberGroup: string | null
    status: string | null
    merchant: string | null // MERCHANT_ID from database
    merchantName: string | null // MERCHANT_NAME from database
    ftdAmount: number | null
    totalWinLoss: number | null
    totalDeposit: number | null
    totalWithdrawal: number | null
    totalPromoTurnOver: number | null
    totalValidBetAmount: number | null
    totalGgr: number | null
    totalNgr: number | null
    ngrDepositPct: number | null
    profitMargin: number | null
    prefProvider: string | null
    prefGames: string | null
    monthlyDeposit: number | null
    playFrequency: string | null
    averageBet: number | null
    createdAt: Date | null
    lastModifiedDate: Date | null
}

// Type for database row result (raw data from Snowflake)
export interface MemberProfileRow {
    MEMBER_ID: number
    MEMBER_LOGIN: string
    MEMBER_NAME: string
    BIRTHDAY: string | null
    REGISTRATION_DATE: string | null
    LAST_LOGIN_DATE: string | null
    CURRENCY: string | null
    MEMBER_GROUP: string | null
    STATUS: string | null
    MERCHANT_ID: string | null
    MERCHANT_NAME: string | null
    FTD_AMOUNT: number | null
    TOTAL_WIN_LOSS: number | null
    TOTAL_DEPOSIT: number | null
    TOTAL_WITHDRAWAL: number | null
    TOTAL_PROMO_TURN_OVER: number | null
    TOTAL_VALID_BET_AMOUNT: number | null
    TOTAL_GGR: number | null
    TOTAL_NGR: number | null
    NGR_DEPOSIT_PCT: number | null
    PROFIT_MARGIN: number | null
    PREF_PROVIDER: string | null
    PREF_GAMES: string | null
    MONTHLY_DEPOSIT: number | null
    PLAY_FREQUENCY: string | null
    AVERAGE_BET: number | null
    CREATED_AT: string | null
    LAST_MODIFIED_DATE: string | null
}
