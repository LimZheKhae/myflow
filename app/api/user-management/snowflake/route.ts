import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/snowflake/config'
import { debugSQL } from '@/lib/utils'

interface UserInfo {
  userId: string
  name: string
  role: string
  isActive: boolean
  email: string
}

// POST - Create new user in SYS_USER_INFO
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('POST request body:', body)
    const { userId, name, role, isActive, email }: UserInfo = body

    // Validate required fields
    if (!userId || !name || !role || !email) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required fields: userId, name, role, email',
        },
        { status: 400 }
      )
    }

    // Check if user already exists
    const checkSQL = `
      SELECT USER_ID 
      FROM MY_FLOW.GLOBAL_CONFIG.SYS_USER_INFO 
      WHERE USER_ID = ?
    `
    const existingUser = await executeQuery(checkSQL, [userId])

    if (Array.isArray(existingUser) && existingUser.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'User already exists in SYS_USER_INFO',
        },
        { status: 409 }
      )
    }

    // Insert new user
    const insertSQL = `
      INSERT INTO MY_FLOW.GLOBAL_CONFIG.SYS_USER_INFO (
        USER_ID, NAME, ROLE, IS_ACTIVE, EMAIL
      ) VALUES (?, ?, ?, ?, ?)
    `
    const insertParams = [userId, name, role, isActive ? 1 : 0, email]
    debugSQL(insertSQL, insertParams, 'Insert User into SYS_USER_INFO')
    await executeQuery(insertSQL, insertParams)

    return NextResponse.json({
      success: true,
      message: 'User created successfully in SYS_USER_INFO',
    })
  } catch (error) {
    console.error('Error creating user in SYS_USER_INFO:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to create user in SYS_USER_INFO',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// PUT - Update existing user in SYS_USER_INFO
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('PUT request body:', body)
    const { userId, name, role, isActive, email }: UserInfo = body

    // Validate required fields
    if (!userId || !name || !role || !email) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required fields: userId, name, role, email',
        },
        { status: 400 }
      )
    }

    // Check if user exists
    const checkSQL = `
      SELECT USER_ID 
      FROM MY_FLOW.GLOBAL_CONFIG.SYS_USER_INFO 
      WHERE USER_ID = ?
    `
    const existingUser = await executeQuery(checkSQL, [userId])

    if (!Array.isArray(existingUser) || existingUser.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'User not found in SYS_USER_INFO',
        },
        { status: 404 }
      )
    }

    // Update existing user
    const updateSQL = `
      UPDATE MY_FLOW.GLOBAL_CONFIG.SYS_USER_INFO 
      SET NAME = ?, ROLE = ?, IS_ACTIVE = ?, EMAIL = ?
      WHERE USER_ID = ?
    `
    const updateParams = [name, role, isActive ? 1 : 0, email, userId]
    debugSQL(updateSQL, updateParams, 'Update User in SYS_USER_INFO')
    await executeQuery(updateSQL, updateParams)

    return NextResponse.json({
      success: true,
      message: 'User updated successfully in SYS_USER_INFO',
    })
  } catch (error) {
    console.error('Error updating user in SYS_USER_INFO:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to update user in SYS_USER_INFO',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// DELETE - Delete user from SYS_USER_INFO
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required parameter: userId',
        },
        { status: 400 }
      )
    }

    const deleteSQL = `
      DELETE FROM MY_FLOW.GLOBAL_CONFIG.SYS_USER_INFO 
      WHERE USER_ID = ?
    `
    const deleteParams = [userId]
    debugSQL(deleteSQL, deleteParams, 'Delete User from SYS_USER_INFO')
    await executeQuery(deleteSQL, deleteParams)

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully from SYS_USER_INFO',
    })
  } catch (error) {
    console.error('Error deleting user from SYS_USER_INFO:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to delete user from SYS_USER_INFO',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// GET - Get user from SYS_USER_INFO
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required parameter: userId',
        },
        { status: 400 }
      )
    }

    const selectSQL = `
      SELECT USER_ID, NAME, ROLE, IS_ACTIVE, EMAIL
      FROM MY_FLOW.GLOBAL_CONFIG.SYS_USER_INFO 
      WHERE USER_ID = ?
    `
    const selectParams = [userId]
    debugSQL(selectSQL, selectParams, 'Get User from SYS_USER_INFO')
    const result = await executeQuery(selectSQL, selectParams)

    if (Array.isArray(result) && result.length > 0) {
      return NextResponse.json({
        success: true,
        data: result[0],
        message: 'User retrieved successfully from SYS_USER_INFO',
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          message: 'User not found in SYS_USER_INFO',
        },
        { status: 404 }
      )
    }
  } catch (error) {
    console.error('Error getting user from SYS_USER_INFO:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to get user from SYS_USER_INFO',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
