// Sandbox di Stripe: stampa il link per completare l'iscrizione di un conto di
// PROVA, e come sta adesso. Serve ad avere in locale un conto «attivo» accanto a
// quelli «a metà», per provare tutti e due i casi dei pagamenti.
//
// L'iscrizione la deve fare una persona: la pagina di Stripe ha un controllo
// anti-robot e l'API non lascia alla piattaforma compilare i dati dell'intestatario.
//
// Uso:  node stripe-sandbox-link.mjs [acct_…]      (dalla cartella tests)
// Si rifiuta di partire con una chiave che non sia di prova.
import fs from 'fs'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const Stripe = require('../client-next/node_modules/stripe')
const env = Object.fromEntries(fs.readFileSync('../client-next/.env.local', 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter(l => l.includes('='))
  .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
const chiave = env.STRIPE_SECRET_KEY || ''
if (!chiave.startsWith('sk_test')) { console.error('La chiave in client-next/.env.local non è di prova: mi fermo.'); process.exit(1) }
const stripe = new Stripe(chiave)
const V = { apiVersion: '2026-08-26.dahlia' }

let conto = process.argv[2]
if (!conto) for await (const acc of stripe.accounts.list({ limit: 100 })) { if (acc.business_profile?.name || acc.settings?.dashboard?.display_name) { conto = acc.id; break } }
if (!conto) { console.error('Nessun conto di prova con un nome nella sandbox.'); process.exit(1) }

const a = await stripe.v2.core.accounts.retrieve(conto, { include: ['configuration.merchant', 'requirements'] }, V)
const carte = a.configuration?.merchant?.capabilities?.card_payments?.status
console.log(`conto ${conto}: carte «${carte}», ${(a.requirements?.entries || []).length} dati mancanti`)
if (carte === 'active') { console.log('È già attivo: non serve fare niente.'); process.exit(0) }
const link = await stripe.v2.core.accountLinks.create({ account: conto, use_case: { type: 'account_onboarding', account_onboarding: {
  configurations: ['merchant', 'customer'], refresh_url: 'https://www.oltrenova.com/', return_url: 'https://www.oltrenova.com/' } } }, V)
console.log('\nApri questo indirizzo (scade in pochi minuti; se è scaduto rilancia il comando):\n\n' + link.url + '\n')
