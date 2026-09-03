import { NextRequest, NextResponse } from 'next/server';
import { getPortfolio } from '@nexora/sdk';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { error: 'Invalid Ethereum address' },
        { status: 400 }
      );
    }

    const portfolio = await getPortfolio(address);

    return NextResponse.json({
      ...portfolio,
      tokenBalances: portfolio.tokenBalances.map(b => ({
        ...b,
        balance: b.balance.toString(),
      })),
      lpPositions: (portfolio.lpPositions as any[]).map(p => ({
        ...p,
        lpTokens: p.lpTokens?.toString() ?? '0',
        feesEarned0: p.feesEarned0?.toString() ?? '0',
        feesEarned1: p.feesEarned1?.toString() ?? '0',
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API/portfolio]', error);
    return NextResponse.json({ error: 'Failed to fetch portfolio' }, { status: 500 });
  }
}
