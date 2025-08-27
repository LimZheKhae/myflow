import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake/config'
import { debugSQL } from '@/lib/utils'

interface BulkValidationRequest {
  memberLogins: string[]
}

interface BulkValidationResponse {
  success: boolean
  data?: {
    valid: Array<{ memberLogin: string; memberId: string; memberName: string }>
    invalid: string[]
  }
  message: string
}

// POST - Validate multiple member logins in a single query
export async function POST(request: NextRequest): Promise<NextResponse<BulkValidationResponse>> {
  try {
    const { memberLogins }: BulkValidationRequest = await request.json()

    if (!memberLogins || !Array.isArray(memberLogins) || memberLogins.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'memberLogins array is required and must not be empty',
        },
        { status: 400 }
      )
    }

    // Limit to prevent excessive queries (adjust as needed)
    if (memberLogins.length > 10000) {
      return NextResponse.json(
        {
          success: false,
          message: 'Maximum 10,000 member logins allowed per request',
        },
        { status: 400 }
      )
    }

    // Clean and deduplicate member logins
    const cleanedLogins = [...new Set(memberLogins.map((login) => login.trim().toLowerCase()))].filter(Boolean)

    if (cleanedLogins.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'No valid member logins provided after cleaning',
        },
        { status: 400 }
      )
    }

    // Create placeholders for the IN clause
    const placeholders = cleanedLogins.map(() => '?').join(', ')

    // Single query to validate all member logins
    const validationSQL = `
      SELECT DISTINCT 
        LOWER(MEMBER_LOGIN) as MEMBER_LOGIN,
        MEMBER_ID,
        MEMBER_NAME
      FROM PROD_ALPHATEL.MART.MEMBER_INFO 
      WHERE LOWER(MEMBER_LOGIN) IN (${placeholders})
    `

    debugSQL(validationSQL, cleanedLogins, 'Bulk Player Validation')
    const validPlayers = await executeQuery(validationSQL, cleanedLogins)

    // Separate valid and invalid logins
    const validLogins = new Set(Array.isArray(validPlayers) ? validPlayers.map((player: any) => player.MEMBER_LOGIN.toLowerCase()) : [])

    const valid = Array.isArray(validPlayers)
      ? validPlayers.map((player: any) => ({
          memberLogin: player.MEMBER_LOGIN,
          memberId: player.MEMBER_ID,
          memberName: player.MEMBER_NAME,
        }))
      : []

    const invalid = cleanedLogins.filter((login) => !validLogins.has(login.toLowerCase()))

    return NextResponse.json({
      success: true,
      data: {
        valid,
        invalid,
      },
      message: `Validated ${cleanedLogins.length} member logins. ${valid.length} valid, ${invalid.length} invalid.`,
    })
  } catch (error) {
    console.error('Error in bulk player validation:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to validate member logins',
      },
      { status: 500 }
    )
  }
}
