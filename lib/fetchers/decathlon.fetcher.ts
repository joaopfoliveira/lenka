import { Product, ProductCategory, ProductFetcher, FetcherOptions, calculateDifficulty, createProductId } from '../productTypes';

const DECATHLON_HOST = 'https://www.decathlon.pt';
const BASE_LISTING_URL = `${DECATHLON_HOST}/api/listing/pt-PT?pageType=browse&url=`;

type SportListing = {
  label: string;
  path: string;
};

const DECATHLON_SPORTS: SportListing[] = [
  { label: 'Alpinismo', path: '/todos-os-desportos/alpinismo' },
  { label: 'Andebol', path: '/todos-os-desportos/andebol' },
  { label: 'Artes Marciais', path: '/todos-os-desportos/artes-marciais' },
  { label: 'Atletismo', path: '/todos-os-desportos/atletismo' },
  { label: 'Badminton', path: '/todos-os-desportos/badminton' },
  { label: 'Basebol', path: '/todos-os-desportos/basebol' },
  { label: 'Basquetebol', path: '/todos-os-desportos/basquetebol' },
  { label: 'Beach Tennis', path: '/todos-os-desportos/beach-tennis' },
  { label: 'Bilhar', path: '/todos-os-desportos/bilhar' },
  { label: 'Bodyboard', path: '/todos-os-desportos/bodyboard' },
  { label: 'Boomerang e Discos Voadores', path: '/todos-os-desportos/boomerang-e-discos-voadores' },
  { label: 'Boxe, Kickboxing e Muay Thai', path: '/todos-os-desportos/boxe-kickboxing-e-muay-thai' },
  { label: 'Bushcraft', path: '/todos-os-desportos/bushcraft' },
  { label: 'Caminhada', path: '/todos-os-desportos/caminhada' },
  { label: 'Caminhada na natureza e trekking', path: '/todos-os-desportos/caminhada-na-natureza-e-trekking' },
  { label: 'Campismo', path: '/todos-os-desportos/campismo' },
  { label: 'Canoagem e Kayak', path: '/todos-os-desportos/canoagem-e-kayak' },
  { label: 'Canyoning', path: '/todos-os-desportos/canyoning' },
  { label: 'Caça e cão', path: '/todos-os-desportos/caca-e-cao' },
  { label: 'Ciclismo', path: '/todos-os-desportos/ciclismo' },
  { label: 'Circo', path: '/todos-os-desportos/circo' },
  { label: 'Corrida', path: '/todos-os-desportos/corrida' },
  { label: 'Cross Training, Treino funcional', path: '/todos-os-desportos/cross-training-treino-funcional' },
  { label: 'Dança', path: '/todos-os-desportos/danca' },
  { label: 'Dardos', path: '/todos-os-desportos/dardos' },
  { label: 'Desporto Adaptado', path: '/todos-os-desportos/desporto-adaptado' },
  { label: 'Desportos de Neve', path: '/todos-os-desportos/desportos-de-neve' },
  { label: 'Educação Física', path: '/todos-os-desportos/educacao-fisica' },
  { label: 'Equitação', path: '/todos-os-desportos/equitacao' },
  { label: 'Escalada', path: '/todos-os-desportos/escalada' },
  { label: 'Esgrima', path: '/todos-os-desportos/esgrima' },
  { label: 'Fitness', path: '/todos-os-desportos/fitness' },
  { label: 'Floorball', path: '/todos-os-desportos/floorball' },
  { label: 'Fronténis', path: '/todos-os-desportos/frontenis' },
  { label: 'Futebol', path: '/todos-os-desportos/futebol' },
  { label: 'Futebol Americano', path: '/todos-os-desportos/futebol-americano' },
  { label: 'Futebol de Praia', path: '/todos-os-desportos/futebol-de-praia' },
  { label: 'Futsal', path: '/todos-os-desportos/futsal' },
  { label: 'Ginástica Artística e Rítmica', path: '/todos-os-desportos/ginastica-artistica-e-ritmica' },
  { label: 'Ginástica de Bebé', path: '/todos-os-desportos/ginastica-de-bebe' },
  { label: 'Golf', path: '/todos-os-desportos/golf' },
  { label: 'Hidroginástica, Aquabike', path: '/todos-os-desportos/hidroginastica-aquabike' },
  { label: 'Hóquei', path: '/todos-os-desportos/hoquei' },
  { label: 'Marcha Aquática', path: '/todos-os-desportos/marcha-aquatica' },
  { label: 'Marcha Atlética', path: '/todos-os-desportos/marcha-atletica' },
  { label: 'Mergulho', path: '/todos-os-desportos/mergulho' },
  { label: 'Mobilidade Urbana', path: '/todos-os-desportos/mobilidade-urbana' },
  { label: 'Musculação', path: '/todos-os-desportos/musculacao' },
  { label: 'Natação', path: '/todos-os-desportos/natacao' },
  { label: 'Natação Artística (Sincronizada)', path: '/todos-os-desportos/natacao-artistica-sincronizada' },
  { label: 'Natação Águas Abertas, SwimRun', path: '/todos-os-desportos/natacao-aguas-abertas-swimrun' },
  { label: 'Orientação', path: '/todos-os-desportos/orientacao' },
  { label: 'Padel', path: '/todos-os-desportos/padel' },
  { label: 'Papagaios, Kitesurf e Landkite', path: '/todos-os-desportos/papagaios-kitesurf-e-landkite' },
  { label: 'Patinagem no gelo', path: '/todos-os-desportos/patinagem-no-gelo' },
  { label: 'Patins', path: '/todos-os-desportos/patins' },
  { label: 'Pesca Predadores em Água Doce', path: '/todos-os-desportos/pesca-predadores-em-agua-doce' },
  { label: 'Pesca em Água Doce', path: '/todos-os-desportos/pesca-em-agua-doce' },
  { label: 'Pesca no mar', path: '/todos-os-desportos/pesca-no-mar' },
  { label: 'Pesca à Carpa – Carpfishing', path: '/todos-os-desportos/pesca-a-carpa-carpfishing' },
  { label: 'Petanca e Jogos Tradicionais', path: '/todos-os-desportos/petanca-e-jogos-tradicionais' },
  { label: 'Ping Pong', path: '/todos-os-desportos/ping-pong' },
  { label: 'Polo Aquático', path: '/todos-os-desportos/polo-aquatico' },
  { label: 'Roundnet', path: '/todos-os-desportos/roundnet' },
  { label: 'Rugby', path: '/todos-os-desportos/rugby' },
  { label: 'Skates, longboards e waveboards', path: '/todos-os-desportos/skates-longboards-e-waveboards' },
  { label: 'Slackline', path: '/todos-os-desportos/slackline' },
  { label: 'Squash', path: '/todos-os-desportos/squash' },
  { label: 'Stand Up Paddle, SUP', path: '/todos-os-desportos/stand-up-paddle-sup' },
  { label: 'Surf', path: '/todos-os-desportos/surf' },
  { label: 'Tchoukball', path: '/todos-os-desportos/tchoukball' },
  { label: 'TeqBall', path: '/todos-os-desportos/teqball' },
  { label: 'Tiro Desportivo', path: '/todos-os-desportos/tiro-desportivo' },
  { label: 'Tiro com Arco', path: '/todos-os-desportos/tiro-com-arco' },
  { label: 'Trail Running', path: '/todos-os-desportos/trail-running' },
  { label: 'Trampolins', path: '/todos-os-desportos/trampolins' },
  { label: 'Triatlo', path: '/todos-os-desportos/triatlo' },
  { label: 'Trotinetes', path: '/todos-os-desportos/trotinetes' },
  { label: 'Ténis', path: '/todos-os-desportos/tenis' },
  { label: 'Vela', path: '/todos-os-desportos/vela' },
  { label: 'Via Ferrata', path: '/todos-os-desportos/via-ferrata' },
  { label: 'Voleibol', path: '/todos-os-desportos/voleibol' },
  { label: 'Voleibol de Praia', path: '/todos-os-desportos/voleibol-de-praia' },
  { label: 'Wakeboard e Desportos de Tração', path: '/todos-os-desportos/wakeboard-e-desportos-de-tracao' },
  { label: 'Windsurf', path: '/todos-os-desportos/windsurf' },
  { label: 'Yoga', path: '/todos-os-desportos/yoga' },
];

interface DecathlonListingResponse {
  products?: any[] | { results?: any[] };
  data?: {
    products?: any[] | { results?: any[] };
    results?: any[] | { hits?: any[] };
  };
  results?: any[] | { hits?: any[] };
}

interface DecathlonPrice {
  value?: number;
  amount?: number;
  min?: number;
  max?: number;
  formattedValue?: string;
}

interface DecathlonBrand {
  label?: string;
  name?: string;
}

interface DecathlonProduct {
  productId?: string;
  id?: string;
  objectID?: string;
  reference?: string;
  slug?: string;
  title?: string;
  name?: string;
  shortLabel?: string;
  description?: string;
  shortDescription?: string;
  price?: DecathlonPrice | number | string;
  images?: Array<{ url?: string; src?: string }>;
  media?: { images?: Array<{ url?: string; src?: string }> };
  picture?: { url?: string };
  image?: { url?: string };
  coverImage?: { url?: string };
  thumbnail?: { src?: string };
  brand?: DecathlonBrand;
  url?: string;
  canonicalUrl?: string;
  canonicalURL?: string;
  link?: string;
}

const SPORTS_CATEGORY: ProductCategory = 'Desporto';

function shuffleArray<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function encodeListingPath(listing: SportListing, from = 0, size = 40): string {
  const path = `${listing.path}?from=${from}&size=${size}`;
  return `${BASE_LISTING_URL}${encodeURIComponent(path)}`;
}

function parsePrice(rawPrice: any): number | null {
  if (rawPrice == null) return null;
  if (typeof rawPrice === 'number') {
    return rawPrice > 500 ? rawPrice / 100 : rawPrice;
  }
  if (typeof rawPrice === 'string') {
    const normalized = parseFloat(rawPrice.replace(/[^\d.,]/g, '').replace(',', '.'));
    return Number.isFinite(normalized) ? normalized : null;
  }

  const candidates: number[] = [];
  const directKeys = ['value', 'amount', 'min', 'max', 'valueWithTaxes', 'referenceValueWithTaxes', 'price'];
  for (const key of directKeys) {
    const value = rawPrice[key];
    if (typeof value === 'number') {
      candidates.push(value);
    }
  }

  const currencies = rawPrice.currencies;
  if (currencies && typeof currencies === 'object') {
    const currencyEntries = Object.values<any>(currencies);
    for (const currency of currencyEntries) {
      for (const key of directKeys) {
        const value = currency?.[key];
        if (typeof value === 'number') {
          candidates.push(value);
        }
      }
    }
  }

  if (candidates.length === 0 && rawPrice.formattedValue) {
    return parsePrice(rawPrice.formattedValue);
  }

  if (candidates.length === 0) {
    return null;
  }

  const price = candidates.find((value) => value > 0) ?? candidates[0];
  return price > 500 ? price / 100 : price;
}

function extractProducts(payload: DecathlonListingResponse): DecathlonProduct[] {
  if (!payload || typeof payload !== 'object') return [];
  const candidates = [
    payload.products,
    (payload.products as any)?.results,
    payload.data?.products,
    payload.data?.products && (payload.data.products as any).results,
    payload.data?.results,
    (payload.data?.results as any)?.hits,
    payload.results,
    (payload.results as any)?.hits,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function extractImage(product: DecathlonProduct, variant?: DecathlonProduct): string | undefined {
  const candidates = [
    variant?.images?.[0]?.src,
    variant?.thumbnail?.src,
    product.images?.[0]?.src,
    product.image?.url,
    product.picture?.url,
    product.coverImage?.url,
    product.media?.images?.[0]?.url,
    product.media?.images?.[0]?.src,
  ];
  return candidates.find((url) => typeof url === 'string' && url.length > 0);
}

function normalizeUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `${DECATHLON_HOST}${url}`;
}

function convertProduct(raw: DecathlonProduct, sport: SportListing): Product | null {
  const variant = raw.models?.[0] || (raw as any);
  const rawId = variant?.id || variant?.skuId || raw.productId || raw.objectID || raw.id || raw.reference || raw.slug;
  const name = variant?.label || raw.title || raw.name || raw.shortLabel;

  if (!rawId || !name) {
    return null;
  }

  const price = parsePrice(variant?.price || raw.price);
  if (!price || price <= 0) {
    return null;
  }

  const imageUrl = extractImage(raw, variant);
  if (!imageUrl) return null;

  const storeUrl = normalizeUrl(
    variant?.url ||
    variant?.urlWithModelOrSupermodel ||
    raw.url ||
    raw.canonicalUrl ||
    raw.canonicalURL ||
    raw.link
  );

  const brand =
    typeof variant?.brand === 'string'
      ? variant.brand
      : variant?.brand?.label || variant?.brand?.name || raw.brand?.label || raw.brand?.name || 'Decathlon';

  return {
    id: createProductId('decathlon', rawId),
    source: 'decathlon',
    name: name.trim(),
    brand,
    category: SPORTS_CATEGORY,
    price,
    currency: 'EUR',
    imageUrl,
    store: 'Decathlon',
    storeUrl,
    description: variant?.description || raw.shortDescription || raw.description,
    difficulty: calculateDifficulty(price),
    updatedAt: new Date().toISOString(),
    minPrice: Math.max(0.5, price * 0.6),
    maxPrice: price * 1.5,
  };
}

async function fetchProductsForSport(sport: SportListing, size: number): Promise<Product[]> {
  const from = Math.floor(Math.random() * 120);
  const url = encodeListingPath(sport, from, size);
  console.log(`🏅 [DECATHLON] Fetching ${sport.label} products (from=${from}) from ${url}`);

  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
      Accept: 'application/json',
      'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
      Referer: `${DECATHLON_HOST}/todos-os-desportos/${sport.slug}`,
    },
  });

  if (!response.ok) {
    console.error(`❌ [DECATHLON] Failed request (${response.status} ${response.statusText})`);
    return [];
  }

  const payload: DecathlonListingResponse = await response.json();
  const items = extractProducts(payload);
  console.log(`📦 [DECATHLON] Got ${items.length} raw products for ${sport.label}`);
  const mapped = items
    .map((item) => convertProduct(item, sport))
    .filter((product): product is Product => product !== null);

  console.log(`✅ [DECATHLON] Converted ${mapped.length} products for ${sport.label}`);
  return mapped;
}

export async function fetchRandomDecathlonProducts(targetCount: number = 10): Promise<Product[]> {
  const sportsQueue = shuffleArray(DECATHLON_SPORTS);
  const perSportSize = Math.max(30, targetCount * 4);
  const perSportSample = Math.max(2, Math.ceil(targetCount / 4));
  const uniqueMap = new Map<string, Product>();

  for (const sport of sportsQueue) {
    if (uniqueMap.size >= targetCount) {
      break;
    }

    try {
      const sportProducts = await fetchProductsForSport(sport, perSportSize);
      const sampled = shuffleArray(sportProducts).slice(0, perSportSample);
      for (const product of sampled) {
        if (!uniqueMap.has(product.id)) {
          uniqueMap.set(product.id, product);
        }
      }
    } catch (error) {
      console.error(`❌ [DECATHLON] Error fetching ${sport.label}:`, error);
    }
  }

  if (uniqueMap.size === 0) {
    console.warn('⚠️ [DECATHLON] No products returned after checking all sports');
    return [];
  }

  const uniqueProducts = shuffleArray(Array.from(uniqueMap.values()));
  return uniqueProducts.slice(0, targetCount);
}

export class DecathlonFetcher implements ProductFetcher {
  source = 'decathlon' as const;
  name = 'Decathlon Sports';

  async fetch(options?: FetcherOptions): Promise<Product[]> {
    const count = options?.maxProducts ?? 40;
    return fetchRandomDecathlonProducts(count);
  }

  async test(): Promise<boolean> {
    const sample = await this.fetch({ maxProducts: 5 });
    return sample.length > 0;
  }
}
