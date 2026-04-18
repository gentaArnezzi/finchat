import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const telegram_id = searchParams.get('telegram_id');

  if (!telegram_id) {
    return NextResponse.redirect(new URL('/?error=no_telegram_id', request.url));
  }

  try {
    // Call API to get token
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const response = await fetch(`${apiUrl}/api/users/token/${telegram_id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!data.success || !data.token) {
      // User not found - redirect to start
      return NextResponse.redirect(new URL('/?error=user_not_found', request.url));
    }

    // Redirect to dashboard with token
    return NextResponse.redirect(
      new URL(`/dashboard?token=${data.token}`, request.url)
    );
  } catch (error) {
    console.error('Login redirect error:', error);
    return NextResponse.redirect(new URL('/?error=login_failed', request.url));
  }
}