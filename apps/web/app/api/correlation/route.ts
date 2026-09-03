import { NextRequest, NextResponse } from 'next/server';
import { getCorrelation } from '@nexora/sdk';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const assetA = searchParams.get('assetA');
    const assetB = searchParams.get('assetB');

    if (!assetA || !assetB) {
      return NextResponse.json(
        { error: 'assetA and assetB query params are required' },
        { status: 400 }
      );
    }

    const result = await getCorrelation(assetA, assetB);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API/correlation]', error);
    return NextResponse.json(
      { error: error?.message ?? 'Failed to calculate correlation' },
      { status: 400 }
    );
  }
}
