import { api } from '@/lib/api-client';
import { parseAcceptResponse, parseOfferList, parseOfferResponse } from './second-chance.parse';

const enc = encodeURIComponent;

export async function fetchMyOffers() {
  const res = await api.get('/second-chance-offers/mine');
  return parseOfferList(res.data);
}

export async function fetchOffer(id: string) {
  const res = await api.get(`/second-chance-offers/${enc(id)}`);
  return parseOfferResponse(res.data);
}

export async function acceptOffer(id: string) {
  const res = await api.post(`/second-chance-offers/${enc(id)}/accept`);
  return parseAcceptResponse(res.data);
}

export async function declineOffer(id: string) {
  const res = await api.post(`/second-chance-offers/${enc(id)}/decline`);
  return parseOfferResponse(res.data);
}

/** Seller: offer a CANCELLED sale's item to the runner-up. */
export async function createSecondChance(saleId: string) {
  const res = await api.post(`/sales/${enc(saleId)}/second-chance`);
  return parseOfferResponse(res.data);
}
