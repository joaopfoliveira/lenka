/**
 * Proxy API for KuantoKusta Categories
 * Bypasses CORS by proxying through our server
 */

import { NextResponse } from 'next/server';

const KUANTOKUSTA_API = 'https://api.kuantokusta.pt';

export async function GET() {
  try {
    console.log('🔄 [PROXY] Fetching categories from KuantoKusta API...');
    
    const response = await fetch(`${KUANTOKUSTA_API}/categories`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
        'Referer': 'https://www.kuantokusta.pt/',
        'Origin': 'https://www.kuantokusta.pt',
      },
    });

    if (!response.ok) {
      console.error(`❌ [PROXY] KuantoKusta API returned ${response.status}`);
      return NextResponse.json(
        { error: `API returned ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`✅ [PROXY] Successfully fetched ${data.length} categories`);

    // Return with CORS headers
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error: any) {
    console.error('❌ [PROXY] Error fetching categories:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch categories' },
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

