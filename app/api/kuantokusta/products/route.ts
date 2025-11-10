/**
 * Proxy API for KuantoKusta Products
 * Bypasses CORS by proxying through our server
 */

import { NextResponse } from 'next/server';

const KUANTOKUSTA_API = 'https://api.kuantokusta.pt';

export async function GET(request: Request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const rows = searchParams.get('rows') || '9';

    if (!categoryId) {
      return NextResponse.json(
        { error: 'categoryId parameter is required' },
        { status: 400 }
      );
    }

    console.log(`🔄 [PROXY] Fetching products for category ${categoryId} (rows: ${rows})...`);
    
    const response = await fetch(
      `${KUANTOKUSTA_API}/products/popular?categoryId=${categoryId}&rows=${rows}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
          'Referer': 'https://www.kuantokusta.pt/',
          'Origin': 'https://www.kuantokusta.pt',
        },
      }
    );

    if (!response.ok) {
      console.error(`❌ [PROXY] KuantoKusta API returned ${response.status} for category ${categoryId}`);
      return NextResponse.json(
        { error: `API returned ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`✅ [PROXY] Successfully fetched ${data.length} products for category ${categoryId}`);

    // Return with CORS headers
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error: any) {
    console.error('❌ [PROXY] Error fetching products:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

