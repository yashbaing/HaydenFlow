import { NextRequest, NextResponse } from 'next/server';
import { buildAssets } from '@nexora/sdk';

export async function GET() {
  try {
    const assets = buildAssets();
    return NextResponse.json({
      assets,
      total: assets.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API/assets]', error);
    return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 });
  }
}
