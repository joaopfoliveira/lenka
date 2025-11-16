const stageNames = [
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
  'Tornado dos Talões'
];

export function getRandomStageName(): string {
  return stageNames[Math.floor(Math.random() * stageNames.length)];
}

export { stageNames };
