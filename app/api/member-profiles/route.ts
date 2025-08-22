import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake/config'

// GET /api/member-profiles - Fetch all member profiles for caching
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [API] Fetching member profiles for cache...')

    // Query the ALL_MEMBER_PROFILE table - First let's try to get all records to test
    const query = `
      SELECT 
        MEMBER_ID,
        MEMBER_LOGIN,
        MEMBER_NAME,
        BIRTHDAY,
        REGISTRATION_DATE,
        LAST_LOGIN_DATE,
        CURRENCY,
        MEMBER_GROUP,
        STATUS,
        MERCHANT_ID,
        FTD_AMOUNT,
        TOTAL_WIN_LOSS,
        TOTAL_DEPOSIT,
        TOTAL_WITHDRAWAL,
        TOTAL_PROMO_TURN_OVER,
        TOTAL_VALID_BET_AMOUNT,
        TOTAL_GGR,
        TOTAL_NGR,
        NGR_DEPOSIT_PCT,
        PROFIT_MARGIN,
        PREF_PROVIDER,
        PREF_GAMES,
        MONTHLY_DEPOSIT,
        PLAY_FREQUENCY,
        AVERAGE_BET,
        CREATED_AT,
        LAST_MODIFIED_DATE
      FROM MY_FLOW.MART.ALL_MEMBER_PROFILE
      WHERE  STATUS = 'ACTIVE'
      ORDER BY MEMBER_LOGIN ASC
    `
    const result = await executeQuery(query)

    if (!Array.isArray(result)) {
      throw new Error('Unexpected result format from database')
    }

    // Transform the data to match our interface
    const memberProfiles = result.map((row: any) => ({
      memberId: row.MEMBER_ID,
      memberLogin: row.MEMBER_LOGIN,
      memberName: row.MEMBER_NAME,
      birthday: row.BIRTHDAY,
      registrationDate: row.REGISTRATION_DATE ? new Date(row.REGISTRATION_DATE) : null,
      lastLoginDate: row.LAST_LOGIN_DATE ? new Date(row.LAST_LOGIN_DATE) : null,
      currency: row.CURRENCY,
      memberGroup: row.MEMBER_GROUP,
      status: row.STATUS,
      merchant: row.MERCHANT_ID,
      ftdAmount: row.FTD_AMOUNT,
      totalWinLoss: row.TOTAL_WIN_LOSS,
      totalDeposit: row.TOTAL_DEPOSIT,
      totalWithdrawal: row.TOTAL_WITHDRAWAL,
      totalPromoTurnOver: row.TOTAL_PROMO_TURN_OVER,
      totalValidBetAmount: row.TOTAL_VALID_BET_AMOUNT,
      totalGgr: row.TOTAL_GGR,
      totalNgr: row.TOTAL_NGR,
      ngrDepositPct: row.NGR_DEPOSIT_PCT,
      profitMargin: row.PROFIT_MARGIN,
      prefProvider: row.PREF_PROVIDER,
      prefGames: row.PREF_GAMES,
      monthlyDeposit: row.MONTHLY_DEPOSIT,
      playFrequency: row.PLAY_FREQUENCY,
      averageBet: row.AVERAGE_BET,
      createdAt: row.CREATED_AT ? new Date(row.CREATED_AT) : null,
      lastModifiedDate: row.LAST_MODIFIED_DATE ? new Date(row.LAST_MODIFIED_DATE) : null,
    }))

    console.log(`✅ [API] Successfully fetched ${memberProfiles.length} member profiles`)

    return NextResponse.json({
      success: true,
      data: memberProfiles,
      count: memberProfiles.length,
      message: `Successfully fetched ${memberProfiles.length} member profiles`,
    })
  } catch (error) {
    console.error('❌ [API] Error fetching member profiles:', error)

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch member profiles',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// POST /api/member-profiles/validate - Validate member logins in bulk
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { memberLogins } = body

    if (!Array.isArray(memberLogins)) {
      return NextResponse.json(
        {
          success: false,
          message: 'memberLogins must be an array',
        },
        { status: 400 }
      )
    }

    console.log(`🔍 [API] Validating ${memberLogins.length} member logins...`)

    // Create a parameterized query for bulk validation
    const placeholders = memberLogins.map(() => '?').join(',')
    const query = `
      SELECT 
        MEMBER_ID,
        MEMBER_LOGIN,
        MEMBER_NAME,
        CURRENCY,
        STATUS,
        MERCHANT_ID
      FROM MY_FLOW.MART.ALL_MEMBER_PROFILE
      WHERE UPPER(MEMBER_LOGIN) IN (${placeholders})
        AND UPPER(STATUS) = 'ACTIVE'
      ORDER BY MEMBER_LOGIN ASC
    `
    // Convert to uppercase for case-insensitive comparison
    const upperCaseLogins = memberLogins.map((login: string) => login.toUpperCase())

    const result = await executeQuery(query, upperCaseLogins)

    if (!Array.isArray(result)) {
      throw new Error('Unexpected result format from database')
    }

    // Process validation results
    const foundLogins = new Set(result.map((row: any) => row.MEMBER_LOGIN.toUpperCase()))

    const validation = memberLogins.map((login: string) => ({
      memberLogin: login,
      isValid: foundLogins.has(login.toUpperCase()),
      member: result.find((row: any) => row.MEMBER_LOGIN.toUpperCase() === login.toUpperCase()) || null,
    }))

    const validCount = validation.filter((v) => v.isValid).length
    const invalidCount = validation.length - validCount

    console.log(`✅ [API] Validation complete: ${validCount} valid, ${invalidCount} invalid`)

    return NextResponse.json({
      success: true,
      data: {
        validation,
        summary: {
          total: memberLogins.length,
          valid: validCount,
          invalid: invalidCount,
        },
      },
      message: `Validated ${memberLogins.length} member logins`,
    })
  } catch (error) {
    console.error('❌ [API] Error validating member logins:', error)

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to validate member logins',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
