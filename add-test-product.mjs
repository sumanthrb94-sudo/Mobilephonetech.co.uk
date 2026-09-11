#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) {
  console.error('❌ Set FIREBASE_SERVICE_ACCOUNT (service-account JSON, raw or base64)');
  process.exit(1);
}

let creds;
try {
  const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  creds = JSON.parse(text);
  if (typeof creds.private_key === 'string') creds.private_key = creds.private_key.replace(/\\n/g, '\n');
} catch (err) {
  console.error(`❌ FIREBASE_SERVICE_ACCOUNT parse error: ${err.message}`);
  process.exit(1);
}

initializeApp({
  credential: cert({
    projectId: creds.project_id,
    clientEmail: creds.client_email,
    privateKey: creds.private_key,
  }),
  projectId: creds.project_id,
});

const db = getFirestore();

const testProduct = {
  model: 'Test Device',
  brand: 'Test',
  category: 'Phones',
  price: 1,
  originalPrice: 1,
  grade: 'Good',
  batteryHealth: 100,
  warrantyMonths: 12,
  returnDays: 30,
  imageUrl: 'https://placehold.co/600x600?text=Test+Device',
  isCertified: false,
  stock: 100,
  specs: { color: 'Black' },
  description: 'A test device for PayPal checkout testing at £1.00',
  searchTerms: ['test', 'te', 'tes', 'device', 'de', 'dev', 'devi', 'devic'],
  createdAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp(),
};

async function addProduct() {
  try {
    const docRef = db.collection('products').doc('test-device-1');
    await docRef.set(testProduct);
    console.log('✅ Test product added to Firestore');
    console.log('   ID: test-device-1');
    console.log('   Brand: Test');
    console.log('   Model: Test Device');
    console.log('   Price: £1.00');
    console.log('   Stock: 100 units');
    console.log('\nYou can now search for "test" on lehart.co.uk');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding product:', error.message);
    process.exit(1);
  }
}

addProduct();
