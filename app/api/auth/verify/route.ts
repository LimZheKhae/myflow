import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ valid: false, error: 'No token provided' }, { status: 400 })
    }

    // Verify the Firebase ID token
    const decodedToken = await auth.verifyIdToken(token)

    return NextResponse.json({
      valid: true,
      uid: decodedToken.uid,
      email: decodedToken.email,
    })
  } catch (error: any) {
    console.error('Token verification failed:', error)
    return NextResponse.json(
      {
        valid: false,
        error: error.message,
      },
      { status: 401 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ valid: false, error: 'No token provided' }, { status: 400 })
    }

    // Verify the Firebase ID token
    const decodedToken = await auth.verifyIdToken(token)

    return NextResponse.json({
      valid: true,
      uid: decodedToken.uid,
      email: decodedToken.email,
    })
  } catch (error: any) {
    console.error('Token verification failed:', error)
    return NextResponse.json(
      {
        valid: false,
        error: error.message,
      },
      { status: 401 }
    )
  }
}
