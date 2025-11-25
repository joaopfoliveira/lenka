type StageNameLanguage = 'en' | 'pt';

const stageNamesPt = [
  'Guru do Folheto',
  'Rainha das Promoções',
  'Mestre das Pechinchas',
  'Fada do Talão',
  'Oráculo do Afiador',
  'Inspector dos Preços',
  'Ninja do Cupão',
  'Capitão Continente',
  'Torpedo do Talho',
  'Diva do Mercado',
  'Sábio das Três Voltas',
  'Chico do Chouriço',
  'Condessa dos Carrinhos',
  'Ministro do IVA',
  'Auditora dos Cêntimos',
  'Rei das Amostras',
  'Pirata dos Brindes',
  'Embaixadora da Feira',
  'Profeta das Promoções',
  'Tornado dos Talões',
];

const stageNamesEn = [
  'Flyer Guru',
  'Promo Queen',
  'Bargain Master',
  'Receipt Fairy',
  'Price Oracle',
  'Deal Inspector',
  'Coupon Ninja',
  'Cart Captain',
  'Butcher Torpedo',
  'Market Diva',
  'Spin Sage',
  'Chorizo Champ',
  'Cart Countess',
  'VAT Minister',
  'Cent Auditor',
  'Sample King',
  'Swag Pirate',
  'Fair Ambassador',
  'Promo Prophet',
  'Receipt Tornado',
];

export function getRandomStageName(language: StageNameLanguage = 'pt'): string {
  const list = language === 'en' ? stageNamesEn : stageNamesPt;
  return list[Math.floor(Math.random() * list.length)];
}

// Back-compat export (Portuguese list)
export { stageNamesPt as stageNames };
export type { StageNameLanguage };
