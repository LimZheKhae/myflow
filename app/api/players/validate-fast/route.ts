import { NextRequest, NextResponse } from 'next/server'
import { validateMemberLoginsFromCache } from '../cache/route'

interface FastValidationRequest {
  memberLogins: string[]
}

interface FastValidationResponse {
  success: boolean
  data?: {
    valid: Array<{ memberLogin: string; memberId: string; memberName: string }>
    invalid: string[]
    validationTime: number
  }
  message: string
}

// POST - Ultra-fast validation using in-memory cache
export async function POST(request: NextRequest): Promise<NextResponse<FastValidationResponse>> {
  const startTime = Date.now()

  console.log('🔍 Member validation API called')

  try {
    const body = await request.json()
    console.log('📥 Request body received:', body)
    const { memberLogins }: FastValidationRequest = body

    if (!memberLogins || !Array.isArray(memberLogins) || memberLogins.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'memberLogins array is required and must not be empty',
        },
        { status: 400 }
      )
    }

    // Limit to prevent excessive processing
    if (memberLogins.length > 50000) {
      return NextResponse.json(
        {
          success: false,
          message: 'Maximum 50,000 member logins allowed per request',
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

    // Use cache for ultra-fast validation
    console.log('🔄 Calling cache validation function...')
    const { valid, invalid } = await validateMemberLoginsFromCache(cleanedLogins)

    const validationTime = Date.now() - startTime
    console.log(`⏱️ Validation completed in ${validationTime}ms`)

    const response = {
      success: true,
      data: {
        valid,
        invalid,
        validationTime,
      },
      message: `Validated ${cleanedLogins.length} member logins in ${validationTime}ms. ${valid.length} valid, ${invalid.length} invalid.`,
    }

    console.log('📤 Sending response:', response)
    return NextResponse.json(response)
  } catch (error) {
    const validationTime = Date.now() - startTime
    console.error('Error in fast player validation:', error)
    return NextResponse.json(
      {
        success: false,
        message: `Failed to validate member logins (${validationTime}ms)`,
      },
      { status: 500 }
    )
  }
}
