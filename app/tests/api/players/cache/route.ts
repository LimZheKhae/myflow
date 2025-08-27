import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake/config'
import { debugSQL } from '@/lib/utils'

// In-memory cache for player data (in production, use Redis)
let playerCache = new Map<string, { memberId: string; memberName: string }>()
let cacheLastUpdated: Date | null = null
const CACHE_TTL = 60 * 60 * 1000 // 1 hour in milliseconds

interface PlayerCacheResponse {
  success: boolean
  data?: {
    totalPlayers: number
    lastUpdated: string | null
    samplePlayers?: Array<{ memberLogin: string; memberId: string; memberName: string }>
  }
  message: string
}

// Load player data into cache
async function loadPlayerCache(): Promise<void> {
  try {
    console.log('🔄 Loading member cache from database...')
    const startTime = Date.now()

    const playersSQL = `
      SELECT DISTINCT 
        LOWER(MEMBER_LOGIN) as MEMBER_LOGIN,
        MEMBER_ID,
        MEMBER_NAME
      FROM PROD_ALPHATEL.MART.MEMBER_INFO 
      WHERE MEMBER_LOGIN IS NOT NULL 
        AND MEMBER_LOGIN != ''
      ORDER BY MEMBER_LOGIN
    `

    console.log('📊 Executing SQL query...')
    debugSQL(playersSQL, [], 'Load Player Cache')
    const players = await executeQuery(playersSQL, [])
    console.log('📊 Database query completed, result type:', typeof players, 'length:', Array.isArray(players) ? players.length : 'not array')

    // Clear existing cache
    playerCache.clear()

    // Populate cache
    if (Array.isArray(players) && players.length > 0) {
      players.forEach((player: any) => {
        playerCache.set(player.MEMBER_LOGIN.toLowerCase(), {
          memberId: player.MEMBER_ID,
          memberName: player.MEMBER_NAME,
        })
      })
      console.log(`✅ Database cache loaded: ${playerCache.size} members`)
    } else {
      console.log('⚠️ No members found in database, using hardcoded fallback')
      // Fallback to hardcoded VIP players
      const fallbackPlayers = [
        { MEMBER_LOGIN: 'john.anderson', MEMBER_ID: '1', MEMBER_NAME: 'John Anderson' },
        { MEMBER_LOGIN: 'maria.rodriguez', MEMBER_ID: '2', MEMBER_NAME: 'Maria Rodriguez' },
        { MEMBER_LOGIN: 'david.kim', MEMBER_ID: '3', MEMBER_NAME: 'David Kim' },
        { MEMBER_LOGIN: 'lisa.wang', MEMBER_ID: '4', MEMBER_NAME: 'Lisa Wang' },
        { MEMBER_LOGIN: 'robert.brown', MEMBER_ID: '5', MEMBER_NAME: 'Robert Brown' },
        { MEMBER_LOGIN: 'emma.davis', MEMBER_ID: '6', MEMBER_NAME: 'Emma Davis' },
      ]

      fallbackPlayers.forEach((player: any) => {
        playerCache.set(player.MEMBER_LOGIN.toLowerCase(), {
          memberId: player.MEMBER_ID,
          memberName: player.MEMBER_NAME,
        })
      })
      console.log(`✅ Fallback cache loaded: ${playerCache.size} members`)
    }

    cacheLastUpdated = new Date()
    const loadTime = Date.now() - startTime

    console.log(`🎉 Member cache loaded: ${playerCache.size} members in ${loadTime}ms`)
  } catch (error) {
    console.error('❌ Error loading member cache from database:', error)
    console.log('🔄 Using hardcoded fallback members...')

    // Fallback to hardcoded VIP players on error
    playerCache.clear()
    const fallbackPlayers = [
      { MEMBER_LOGIN: 'john.anderson', MEMBER_ID: '1', MEMBER_NAME: 'John Anderson' },
      { MEMBER_LOGIN: 'maria.rodriguez', MEMBER_ID: '2', MEMBER_NAME: 'Maria Rodriguez' },
      { MEMBER_LOGIN: 'david.kim', MEMBER_ID: '3', MEMBER_NAME: 'David Kim' },
      { MEMBER_LOGIN: 'lisa.wang', MEMBER_ID: '4', MEMBER_NAME: 'Lisa Wang' },
      { MEMBER_LOGIN: 'robert.brown', MEMBER_ID: '5', MEMBER_NAME: 'Robert Brown' },
      { MEMBER_LOGIN: 'emma.davis', MEMBER_ID: '6', MEMBER_NAME: 'Emma Davis' },
    ]

    fallbackPlayers.forEach((player: any) => {
      playerCache.set(player.MEMBER_LOGIN.toLowerCase(), {
        memberId: player.MEMBER_ID,
        memberName: player.MEMBER_NAME,
      })
    })

    cacheLastUpdated = new Date()
    console.log(`✅ Fallback cache loaded: ${playerCache.size} members after error`)
  }
}

// Check if cache needs refresh
function shouldRefreshCache(): boolean {
  if (!cacheLastUpdated || playerCache.size === 0) {
    return true
  }

  const now = new Date()
  const timeSinceUpdate = now.getTime() - cacheLastUpdated.getTime()
  return timeSinceUpdate > CACHE_TTL
}

// GET - Get cache status and sample data
export async function GET(request: NextRequest): Promise<NextResponse<PlayerCacheResponse>> {
  try {
    // Refresh cache if needed
    if (shouldRefreshCache()) {
      await loadPlayerCache()
    }

    // Get sample players for demonstration
    const samplePlayers = Array.from(playerCache.entries())
      .slice(0, 10)
      .map(([memberLogin, data]) => ({
        memberLogin,
        memberId: data.memberId,
        memberName: data.memberName,
      }))

    return NextResponse.json({
      success: true,
      data: {
        totalPlayers: playerCache.size,
        lastUpdated: cacheLastUpdated?.toISOString() || null,
        samplePlayers,
      },
      message: `Player cache contains ${playerCache.size} players`,
    })
  } catch (error) {
    console.error('Error getting player cache:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to get player cache status',
      },
      { status: 500 }
    )
  }
}

// POST - Force refresh cache
export async function POST(request: NextRequest): Promise<NextResponse<PlayerCacheResponse>> {
  try {
    await loadPlayerCache()

    return NextResponse.json({
      success: true,
      data: {
        totalPlayers: playerCache.size,
        lastUpdated: cacheLastUpdated?.toISOString() || null,
      },
      message: `Player cache refreshed with ${playerCache.size} players`,
    })
  } catch (error) {
    console.error('Error refreshing player cache:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to refresh player cache',
      },
      { status: 500 }
    )
  }
}

// Validate member logins using cache
export async function validateMemberLoginsFromCache(memberLogins: string[]): Promise<{
  valid: Array<{ memberLogin: string; memberId: string; memberName: string }>
  invalid: string[]
}> {
  console.log('🔍 Member cache validation called for', memberLogins.length, 'member logins')

  // Ensure cache is loaded
  if (shouldRefreshCache()) {
    console.log('🔄 Cache needs refresh, loading...')
    await loadPlayerCache()
  } else {
    console.log('✅ Cache is fresh, using existing data')
  }

  const valid: Array<{ memberLogin: string; memberId: string; memberName: string }> = []
  const invalid: string[] = []

  console.log('🔍 Validating', memberLogins.length, 'member logins against cache of', playerCache.size, 'members')

  memberLogins.forEach((login) => {
    const cleanLogin = login.trim().toLowerCase()
    const playerData = playerCache.get(cleanLogin)

    if (playerData) {
      valid.push({
        memberLogin: cleanLogin,
        memberId: playerData.memberId,
        memberName: playerData.memberName,
      })
      console.log(`✅ Valid: ${login} -> ${playerData.memberName}`)
    } else {
      invalid.push(login)
      console.log(`❌ Invalid: ${login}`)
    }
  })

  console.log(`📊 Validation complete: ${valid.length} valid, ${invalid.length} invalid`)
  return { valid, invalid }
}
