// Decides whether a headline is about tigers / tiger conservation in India.
const TIGER = /\btigers?\b|\btigress\b|\btiger reserve|\bbig cats?\b/i;
// must also mention wildlife context, not just the word "tiger"
const CONTEXT = /\b(reserve|forest|wildlife|conservation|NTCA|poach\w*|census|camera[- ]?traps?|national park|sanctuary|habitat|corridor|cubs?|man-?eater|forest department|forest officials?|ranger|tiger (?:count|estimation|death|attack|skin|relocation|translocation|population)|human[- ]wildlife|human[- ]tiger|Project Tiger|Ranthambore|Corbett|Kaziranga|Bandhavgarh|Tadoba|Pench|Kanha|Sundarbans|Panna|Sariska|Nagarjunsagar|Periyar|Bandipur|Nagarhole|Dudhwa|Pilibhit|Melghat|Satpura|Simlipal|Valmiki|Dampa|Orang|Rajaji|Anamalai|Mudumalai|Parambikulam)\b/i;
// obvious non-wildlife uses of the word
const NOISE = /\b(IPL|cricket|T20|Tigers? (?:vs|beat|win)|Detroit Tigers|Leicester|Hull City|Tiger Shroff|Tiger Woods|Tiger 3|Tiger Zinda|Tiger Beer|Tiger Global|Tiger Balm|Triumph|Speed T4|Tiger \d{3,4}|motorcycle|motorbike|bike|scooter|mileage|on-road|ex-showroom|price|SUV|car\b|box office|blockbuster|film|movie|trailer|actor|actress|Bollywood|Tollywood|web series|OTT|serial|celebrat\w*|Instagram|reel|wedding|In Pics|photos?:|Ramayana|stock|shares?|IPO)\b/i;
const BAD_SOURCE = /autocar|bikewale|bikedekho|carwale|cardekho|zigwheels|91mobiles|gsmarena|filmibeat|pinkvilla|bollywood|koimoi|sportskeeda|cricbuzz|espn/i;

export function isTigerNews(i) {
  const t = i.title || "";
  return TIGER.test(t) && CONTEXT.test(t) && !NOISE.test(t) && !BAD_SOURCE.test(i.source || "");
}
