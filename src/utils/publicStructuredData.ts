/** Describe only known public page facts; entity details require verified data. */
export function publicStructuredData(url: string, title: string, description: string, name = 'AEVIC Esports') {
  const page = new URL(url);
  const origin = page.origin;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': origin + '/#organization', name, url: origin + '/' },
      { '@type': 'WebSite', '@id': origin + '/#website', name, url: origin + '/', inLanguage: 'az', publisher: { '@id': origin + '/#organization' } },
      { '@type': 'WebPage', '@id': page.href + '#webpage', url: page.href, name: title, description, inLanguage: 'az', isPartOf: { '@id': origin + '/#website' } },
    ],
  };
}

export function serializeStructuredData(value: ReturnType<typeof publicStructuredData>) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
