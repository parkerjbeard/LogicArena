import { NextResponse } from 'next/server';
import { userAPI } from '@/lib/api';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { supabase_id, email, handle } = body;

    if (!supabase_id || !email) {
      return NextResponse.json(
        { message: 'Supabase ID and email are required' },
        { status: 400 }
      );
    }

    // Call backend to create or update user profile
    const result = await userAPI.createOrUpdateProfile({
      supabase_id,
      email,
      handle: handle || email.split('@')[0],
    });
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Profile sync error:', error);
    
    return NextResponse.json(
      { message: error.response?.data?.detail || 'Failed to sync profile' },
      { status: error.response?.status || 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const supabaseId = searchParams.get('supabase_id');
    
    if (!supabaseId) {
      return NextResponse.json(
        { message: 'Supabase ID is required' },
        { status: 400 }
      );
    }

    // Get user profile by Supabase ID
    const profile = await userAPI.getProfileBySupabaseId(supabaseId);
    
    return NextResponse.json(profile);
  } catch (error: any) {
    console.error('Profile fetch error:', error);
    
    return NextResponse.json(
      { message: error.response?.data?.detail || 'Failed to fetch profile' },
      { status: error.response?.status || 500 }
    );
  }
}