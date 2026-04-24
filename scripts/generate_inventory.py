#!/usr/bin/env python3
"""
Generate TypeScript product data from the inventory CSV export.
"""
import csv
import json
import re
from collections import defaultdict

# Realistic original retail prices for iPhones by model and storage
IPHONE_RETAIL = {
    'iPhone 8': {'64GB': 699, '128GB': 799, '256GB': 899},
    'iPhone 12 Mini': {'64GB': 699, '128GB': 749, '256GB': 849},
    'iPhone 12': {'64GB': 799, '128GB': 849, '256GB': 949},
    'iPhone 12 Pro': {'128GB': 999, '256GB': 1099, '512GB': 1299},
    'iPhone 12 Pro Max': {'128GB': 1099, '256GB': 1199, '512GB': 1399},
    'iPhone 13 Mini': {'128GB': 699, '256GB': 799, '512GB': 999},
    'iPhone 13': {'128GB': 799, '256GB': 899, '512GB': 1099},
    'iPhone 13 Pro': {'128GB': 999, '256GB': 1099, '512GB': 1299, '1TB': 1499},
    'iPhone 13 Pro Max': {'128GB': 1099, '256GB': 1199, '512GB': 1399, '1TB': 1599},
    'iPhone 14': {'128GB': 799, '256GB': 899, '512GB': 1099},
    'iPhone 14 Plus': {'128GB': 899, '256GB': 999, '512GB': 1199},
    'iPhone 14 Pro': {'128GB': 999, '256GB': 1099, '512GB': 1299, '1TB': 1499},
    'iPhone 14 Pro Max': {'128GB': 1099, '256GB': 1199, '512GB': 1399, '1TB': 1599},
    'iPhone 15': {'128GB': 799, '256GB': 899, '512GB': 1099},
    'iPhone 15 Plus': {'128GB': 899, '256GB': 999, '512GB': 1199},
    'iPhone 15 Pro': {'128GB': 999, '256GB': 1099, '512GB': 1299, '1TB': 1499},
    'iPhone 15 Pro Max': {'256GB': 1199, '512GB': 1399, '1TB': 1599},
    'iPhone 16e': {'128GB': 599, '256GB': 699, '512GB': 899},
    'iPhone 16': {'128GB': 799, '256GB': 899, '512GB': 1099},
    'iPhone 16 Plus': {'128GB': 899, '256GB': 999, '512GB': 1199},
    'iPhone 16 Pro': {'128GB': 999, '256GB': 1099, '512GB': 1299, '1TB': 1499},
    'iPhone 16 Pro Max': {'256GB': 1199, '512GB': 1399, '1TB': 1599},
    'iPhone 17': {'256GB': 899, '512GB': 1099},
    'iPhone 17 Pro': {'256GB': 1099, '512GB': 1299, '1TB': 1499},
    'iPhone 17 Pro Max': {'256GB': 1199, '512GB': 1399, '1TB': 1599, '2 TB': 1799},
}

# Condition price multipliers
CONDITION_MULT = {
    'Brand New': 0.95,
    'Premium': 0.82,
    'Excellent': 0.70,
    'Good': 0.55,
    'New': 0.95,
}

GRADE_MAP = {
    'Brand New': 'New',
    'Premium': 'Pristine',
    'Excellent': 'Excellent',
    'Good': 'Good',
    'New': 'New',
}

# iPhone specs database
IPHONE_SPECS = {
    'iPhone 8': {
        'displaySize': '4.7 inches',
        'display': 'Retina HD LCD',
        'displayResolution': '750 x 1334 pixels',
        'displayProtection': 'Ion-strengthened glass',
        'chip': 'Apple A11 Bionic',
        'processor': 'Hexa-core',
        'cpu': '2x Monsoon + 4x Mistral',
        'gpu': 'Apple GPU (3-core)',
        'ram': '2GB',
        'storageExpandable': 'No',
        'mainCamera': '12MP f/1.8',
        'mainCameraFeatures': 'PDAF, OIS, Quad-LED flash',
        'mainCameraVideo': '4K@24/30/60fps, 1080p@30/60/120/240fps',
        'selfieCamera': '7MP f/2.2',
        'selfieCameraFeatures': 'Face detection, HDR',
        'selfieCameraVideo': '1080p@30fps',
        'battery': '1821 mAh',
        'batteryCharging': 'Wired, Qi wireless',
        'batteryChargingSpeed': 'Wired 15W, Wireless 7.5W',
        'bodyDimensions': '138.4 x 67.3 x 7.3 mm',
        'bodyWeight': '148g',
        'bodyBuild': 'Glass front/back, Aluminum frame',
        'bodySIM': 'Nano-SIM',
        'bodyProtection': 'IP67 (water resistant 1m for 30 min)',
        'network': 'GSM/HSPA/LTE',
        'commsWLAN': 'Wi-Fi 5, dual-band, hotspot',
        'commsBluetooth': '5.0, A2DP, LE',
        'commsNFC': 'Yes',
        'commsUSB': 'Lightning',
        'soundLoudspeaker': 'Yes, stereo speakers',
        'soundJack': 'No',
    },
    'iPhone 12 Mini': {
        'displaySize': '5.4 inches',
        'display': 'Super Retina XDR OLED',
        'displayResolution': '1080 x 2340 pixels',
        'displayProtection': 'Ceramic Shield glass',
        'displayFeatures': 'HDR10, Dolby Vision, 625 nits',
        'chip': 'Apple A14 Bionic',
        'processor': 'Hexa-core',
        'cpu': '2x3.1GHz + 4x1.8GHz',
        'gpu': 'Apple GPU (4-core)',
        'ram': '4GB',
        'storageExpandable': 'No',
        'mainCamera': '12MP f/1.6',
        'mainCameraFeatures': 'Dual pixel PDAF, OIS, LED flash',
        'mainCameraVideo': '4K@24/30/60fps, 1080p@30/60/120/240fps',
        'selfieCamera': '12MP f/2.2',
        'selfieCameraFeatures': 'HDR, Face ID',
        'selfieCameraVideo': '4K@24/30/60fps, 1080p@30/60/120fps',
        'battery': '2227 mAh',
        'batteryCharging': 'Wired, MagSafe, Qi wireless',
        'batteryChargingSpeed': 'Wired 20W, Wireless 15W',
        'bodyDimensions': '131.5 x 64.2 x 7.4 mm',
        'bodyWeight': '135g',
        'bodyBuild': 'Glass front/back, Aluminum frame',
        'bodySIM': 'Nano-SIM + eSIM',
        'bodyProtection': 'IP68 (water resistant 6m for 30 min)',
        'network': 'GSM/HSPA/LTE/5G',
        'commsWLAN': 'Wi-Fi 6, dual-band, hotspot',
        'commsBluetooth': '5.0, A2DP, LE',
        'commsNFC': 'Yes',
        'commsUSB': 'Lightning',
        'soundLoudspeaker': 'Yes, stereo speakers',
        'soundJack': 'No',
    },
    'iPhone 12': {
        'displaySize': '6.1 inches',
        'display': 'Super Retina XDR OLED',
        'displayResolution': '1170 x 2532 pixels',
        'displayProtection': 'Ceramic Shield glass',
        'displayFeatures': 'HDR10, Dolby Vision, 625 nits',
        'chip': 'Apple A14 Bionic',
        'processor': 'Hexa-core',
        'cpu': '2x3.1GHz + 4x1.8GHz',
        'gpu': 'Apple GPU (4-core)',
        'ram': '4GB',
        'storageExpandable': 'No',
        'mainCamera': '12MP f/1.6',
        'mainCameraFeatures': 'Dual pixel PDAF, OIS, LED flash',
        'mainCameraVideo': '4K@24/30/60fps, 1080p@30/60/120/240fps',
        'selfieCamera': '12MP f/2.2',
        'selfieCameraFeatures': 'HDR, Face ID',
        'selfieCameraVideo': '4K@24/30/60fps, 1080p@30/60/120fps',
        'battery': '2815 mAh',
        'batteryCharging': 'Wired, MagSafe, Qi wireless',
        'batteryChargingSpeed': 'Wired 20W, Wireless 15W',
        'bodyDimensions': '146.7 x 71.5 x 7.4 mm',
        'bodyWeight': '164g',
        'bodyBuild': 'Glass front/back, Aluminum frame',
        'bodySIM': 'Nano-SIM + eSIM',
        'bodyProtection': 'IP68 (water resistant 6m for 30 min)',
        'network': 'GSM/HSPA/LTE/5G',
        'commsWLAN': 'Wi-Fi 6, dual-band, hotspot',
        'commsBluetooth': '5.0, A2DP, LE',
        'commsNFC': 'Yes',
        'commsUSB': 'Lightning',
        'soundLoudspeaker': 'Yes, stereo speakers',
        'soundJack': 'No',
    },
    'iPhone 12 Pro': {
        'displaySize': '6.1 inches',
        'display': 'Super Retina XDR OLED',
        'displayResolution': '1170 x 2532 pixels',
        'displayProtection': 'Ceramic Shield glass',
        'displayFeatures': 'HDR10, Dolby Vision, 800 nits',
        'chip': 'Apple A14 Bionic',
        'processor': 'Hexa-core',
        'cpu': '2x3.1GHz + 4x1.8GHz',
        'gpu': 'Apple GPU (4-core)',
        'ram': '6GB',
        'storageExpandable': 'No',
        'mainCamera': '12MP f/1.6 triple',
        'mainCameraFeatures': 'Dual pixel PDAF, sensor-shift OIS, LiDAR',
        'mainCameraVideo': '4K@24/30/60fps, 1080p@30/60/120/240fps',
        'selfieCamera': '12MP f/2.2',
        'selfieCameraFeatures': 'HDR, Face ID',
        'selfieCameraVideo': '4K@24/30/60fps, 1080p@30/60/120fps',
        'battery': '2815 mAh',
        'batteryCharging': 'Wired, MagSafe, Qi wireless',
        'batteryChargingSpeed': 'Wired 20W, Wireless 15W',
        'bodyDimensions': '146.7 x 71.5 x 7.4 mm',
        'bodyWeight': '189g',
        'bodyBuild': 'Glass front/back, Stainless steel frame',
        'bodySIM': 'Nano-SIM + eSIM',
        'bodyProtection': 'IP68 (water resistant 6m for 30 min)',
        'network': 'GSM/HSPA/LTE/5G',
        'commsWLAN': 'Wi-Fi 6, dual-band, hotspot',
        'commsBluetooth': '5.0, A2DP, LE',
        'commsNFC': 'Yes',
        'commsUSB': 'Lightning',
        'soundLoudspeaker': 'Yes, stereo speakers',
        'soundJack': 'No',
    },
    'iPhone 12 Pro Max': {
        'displaySize': '6.7 inches',
        'display': 'Super Retina XDR OLED',
        'displayResolution': '1284 x 2778 pixels',
        'displayProtection': 'Ceramic Shield glass',
        'displayFeatures': 'HDR10, Dolby Vision, 800 nits',
        'chip': 'Apple A14 Bionic',
        'processor': 'Hexa-core',
        'cpu': '2x3.1GHz + 4x1.8GHz',
        'gpu': 'Apple GPU (4-core)',
        'ram': '6GB',
        'storageExpandable': 'No',
        'mainCamera': '12MP f/1.6 triple',
        'mainCameraFeatures': 'Dual pixel PDAF, sensor-shift OIS, LiDAR, 2.5x optical zoom',
        'mainCameraVideo': '4K@24/30/60fps, 1080p@30/60/120/240fps',
        'selfieCamera': '12MP f/2.2',
        'selfieCameraFeatures': 'HDR, Face ID',
        'selfieCameraVideo': '4K@24/30/60fps, 1080p@30/60/120fps',
        'battery': '3687 mAh',
        'batteryCharging': 'Wired, MagSafe, Qi wireless',
        'batteryChargingSpeed': 'Wired 20W, Wireless 15W',
        'bodyDimensions': '160.8 x 78.1 x 7.4 mm',
        'bodyWeight': '228g',
        'bodyBuild': 'Glass front/back, Stainless steel frame',
        'bodySIM': 'Nano-SIM + eSIM',
        'bodyProtection': 'IP68 (water resistant 6m for 30 min)',
        'network': 'GSM/HSPA/LTE/5G',
        'commsWLAN': 'Wi-Fi 6, dual-band, hotspot',
        'commsBluetooth': '5.0, A2DP, LE',
        'commsNFC': 'Yes',
        'commsUSB': 'Lightning',
        'soundLoudspeaker': 'Yes, stereo speakers',
        'soundJack': 'No',
    },
    'iPhone 13 Mini': {
        'displaySize': '5.4 inches',
        'display': 'Super Retina XDR OLED',
        'displayResolution': '1080 x 2340 pixels',
        'displayProtection': 'Ceramic Shield glass',
        'displayFeatures': 'HDR10, Dolby Vision, 800 nits',
        'chip': 'Apple A15 Bionic',
        'processor': 'Hexa-core',
        'cpu': '2x3.23GHz + 4x1.82GHz',
        'gpu': 'Apple GPU (4-core)',
        'ram': '4GB',
        'storageExpandable': 'No',
        'mainCamera': '12MP f/1.6 dual',
        'mainCameraFeatures': 'Sensor-shift OIS, LED flash',
        'mainCameraVideo': '4K@24/30/60fps, 1080p@30/60/120/240fps',
        'selfieCamera': '12MP f/2.2',
        'selfieCameraFeatures': 'HDR, Face ID',
        'selfieCameraVideo': '4K@24/30/60fps, 1080p@30/60/120fps',
        'battery': '2438 mAh',
        'batteryCharging': 'Wired, MagSafe, Qi wireless',
        'batteryChargingSpeed': 'Wired 20W, Wireless 15W',
        'bodyDimensions': '131.5 x 64.2 x 7.7 mm',
        'bodyWeight': '141g',
        'bodyBuild': 'Glass front/back, Aluminum frame',
        'bodySIM': 'Nano-SIM + eSIM',
        'bodyProtection': 'IP68 (water resistant 6m for 30 min)',
        'network': 'GSM/HSPA/LTE/5G',
        'commsWLAN': 'Wi-Fi 6, dual-band, hotspot',
        'commsBluetooth': '5.0, A2DP, LE',
        'commsNFC': 'Yes',
        'commsUSB': 'Lightning',
        'soundLoudspeaker': 'Yes, stereo speakers',
        'soundJack': 'No',
    },
    'iPhone 13': {
        'displaySize': '6.1 inches',
        'display': 'Super Retina XDR OLED',
        'displayResolution': '1170 x 2532 pixels',
        'displayProtection': 'Ceramic Shield glass',
        'displayFeatures': 'HDR10, Dolby Vision, 800 nits',
        'chip': 'Apple A15 Bionic',
        'processor': 'Hexa-core',
        'cpu': '2x3.23GHz + 4x1.82GHz',
        'gpu': 'Apple GPU (4-core)',
        'ram': '4GB',
        'storageExpandable': 'No',
        'mainCamera': '12MP f/1.6 dual',
        'mainCameraFeatures': 'Sensor-shift OIS, LED flash',
        'mainCameraVideo': '4K@24/30/60fps, 1080p@30/60/120/240fps',
        'selfieCamera': '12MP f/2.2',
        'selfieCameraFeatures': 'HDR, Face ID',
        'selfieCameraVideo': '4K@24/30/60fps, 1080p@30/60/120fps',
        'battery': '3227 mAh',
        'batteryCharging': 'Wired, MagSafe, Qi wireless',
        'batteryChargingSpeed': 'Wired 20W, Wireless 15W',
        'bodyDimensions': '146.7 x 71.5 x 7.7 mm',
        'bodyWeight': '174g',
        'bodyBuild': 'Glass front/back, Aluminum frame',
        'bodySIM': 'Nano-SIM + eSIM',
        'bodyProtection': 'IP68 (water resistant 6m for 30 min)',
        'network': 'GSM/HSPA/LTE/5G',
        'commsWLAN': 'Wi-Fi 6, dual-band, hotspot',
        'commsBluetooth': '5.0, A2DP, LE',
        'commsNFC': 'Yes',
        'commsUSB': 'Lightning',
        'soundLoudspeaker': 'Yes, stereo speakers',
        'soundJack': 'No',
    },
    'iPhone 13 Pro': {
        'displaySize': '6.1 inches',
        'display': 'Super Retina XDR OLED',
        'displayResolution': '1170 x 2532 pixels',
        'displayProtection': 'Ceramic Shield glass',
        'displayFeatures': '120Hz, HDR10, Dolby Vision, 1000 nits',
        'chip': 'Apple A15 Bionic',
        'processor': 'Hexa-core',
        'cpu': '2x3.23GHz + 4x1.82GHz',
        'gpu': 'Apple GPU (5-core)',
        'ram': '6GB',
        'storageExpandable': 'No',
        'mainCamera': '12MP f/1.5 triple',
        'mainCameraFeatures': 'Sensor-shift OIS, LiDAR, 3x optical zoom',
        'mainCameraVideo': '4K@24/30/60fps, 1080p@30/60/120/240fps',
        'selfieCamera': '12MP f/2.2',
        'selfieCameraFeatures': 'HDR, Face ID',
        'selfieCameraVideo': '4K@24/30/60fps, 1080p@30/60/120fps',
        'battery': '3095 mAh',
        'batteryCharging': 'Wired, MagSafe, Qi wireless',
        'batteryChargingSpeed': 'Wired 20W, Wireless 15W',
        'bodyDimensions': '146.7 x 71.5 x 7.7 mm',
        'bodyWeight': '204g',
        'bodyBuild': 'Glass front/back, Stainless steel frame',
        'bodySIM': 'Nano-SIM + eSIM',
        'bodyProtection': 'IP68 (water resistant 6m for 30 min)',
        'network': 'GSM/HSPA/LTE/5G',
        'commsWLAN': 'Wi-Fi 6, dual-band, hotspot',
        'commsBluetooth': '5.0, A2DP, LE',
        'commsNFC': 'Yes',
        'commsUSB': 'Lightning',
        'soundLoudspeaker': 'Yes, stereo speakers',
        'soundJack': 'No',
    },
    'iPhone 13 Pro Max': {
        'displaySize': '6.7 inches',
        'display': 'Super Retina XDR OLED',
        'displayResolution': '1284 x 2778 pixels',
        'displayProtection': 'Ceramic Shield glass',
        'displayFeatures': '120Hz, HDR10, Dolby Vision, 1000 nits',
        'chip': 'Apple A15 Bionic',
        'processor': 'Hexa-core',
        'cpu': '2x3.23GHz + 4x1.82GHz',
        'gpu': 'Apple GPU (5-core)',
        'ram': '6GB',
        'storageExpandable': 'No',
        'mainCamera': '12MP f/1.5 triple',
        'mainCameraFeatures': 'Sensor-shift OIS, LiDAR, 3x optical zoom',
        'mainCameraVideo': '4K@24/30/60fps, 1080p@30/60/120/240fps',
        'selfieCamera': '12MP f/2.2',
        'selfieCameraFeatures': 'HDR, Face ID',
        'selfieCameraVideo': '4K@24/30/60fps, 1080p@30/60/120fps',
        'battery': '4352 mAh',
        'batteryCharging': 'Wired, MagSafe, Qi wireless',
        'batteryChargingSpeed': 'Wired 20W, Wireless 15W',
        'bodyDimensions': '160.8 x 78.1 x 7.7 mm',
        'bodyWeight': '240g',
        'bodyBuild': 'Glass front/back, Stainless steel frame',
        'bodySIM': 'Nano-SIM + eSIM',
        'bodyProtection': 'IP68 (water resistant 6m for 30 min)',
        'network': 'GSM/HSPA/LTE/5G',
        'commsWLAN': 'Wi-Fi 6, dual-band, hotspot',
        'commsBluetooth': '5.0, A2DP, LE',
        'commsNFC': 'Yes',
        'commsUSB': 'Lightning',
        'soundLoudspeaker': 'Yes, stereo speakers',
        'soundJack': 'No',
    },
    'iPhone 14': {
        'displaySize': '6.1 inches',
        'display': 'Super Retina XDR OLED',
        'displayResolution': '1170 x 2532 pixels',
        'displayProtection': 'Ceramic Shield glass',
        'displayFeatures': 'HDR10, Dolby Vision, 800 nits',
        'chip': 'Apple A15 Bionic',
        'processor': 'Hexa-core',
        'cpu': '2x3.23GHz + 4x1.82GHz',
        'gpu': 'Apple GPU (5-core)',
        'ram': '6GB',
        'storageExpandable': 'No',
        'mainCamera': '12MP f/1.5 dual',
        'mainCameraFeatures': 'Sensor-shift OIS, LED flash, Action mode',
        'mainCameraVideo': '4K@24/30/60fps, 1080p@30/60/120/240fps',
        'selfieCamera': '12MP f/1.9',
        'selfieCameraFeatures': 'PDAF, HDR, Face ID',
        'selfieCameraVideo': '4K@24/30/60fps, 1080p@30/60/120fps',
        'battery': '3279 mAh',
        'batteryCharging': 'Wired, MagSafe, Qi wireless',
        'batteryChargingSpeed': 'Wired 20W, Wireless 15W',
        'bodyDimensions': '146.7 x 71.5 x 7.8 mm',
        'bodyWeight': '172g',
        'bodyBuild': 'Glass front/back, Aluminum frame',
        'bodySIM': 'Nano-SIM + eSIM',
        'bodyProtection': 'IP68 (water resistant 6m for 30 min)',
        'network': 'GSM/HSPA/LTE/5G',
        'commsWLAN': 'Wi-Fi 6, dual-band, hotspot',
        'commsBluetooth': '5.3, A2DP, LE',
        'commsNFC': 'Yes',
        'commsUSB': 'Lightning',
        'soundLoudspeaker': 'Yes, stereo speakers',
        'soundJack': 'No',
    },
    'iPhone 14 Plus': {
        'displaySize': '6.7 inches',
        'display': 'Super Retina XDR OLED',
        'displayResolution': '1284 x 2778 pixels',
        'displayProtection': 'Ceramic Shield glass',
        'displayFeatures': 'HDR10, Dolby Vision, 800 nits',
        'chip': 'Apple A15 Bionic',
        'processor': 'Hexa-core',
        'cpu': '2x3.23GHz + 4x1.82GHz',
        'gpu': 'Apple GPU (5-core)',
        'ram': '6GB',
        'storageExpandable': 'No',
        'mainCamera': '12MP f/1.5 dual',
        'mainCameraFeatures': 'Sensor-shift OIS, LED flash, Action mode',
        'mainCameraVideo': '4K@24/30/60fps, 1080p@30/60/120/240fps',
        'selfieCamera': '12MP f/1.9',
        'selfieCameraFeatures': 'PDAF, HDR, Face ID',
        'selfieCameraVideo': '4K@24/30/60fps, 1080p@30/60/120fps',
        'battery': '4325 mAh',
        'batteryCharging': 'Wired, MagSafe, Qi wireless',
        'batteryChargingSpeed': 'Wired 20W, Wireless 15W',
        'bodyDimensions': '160.8 x 78.1 x 7.8 mm',
        'bodyWeight': '203g',
        'bodyBuild': 'Glass front/back, Aluminum frame',
        'bodySIM': 'Nano-SIM + eSIM',
        'bodyProtection': 'IP68 (water resistant 6m for 30 min)',
        'network': 'GSM/HSPA/LTE/5G',
        'commsWLAN': 'Wi-Fi 6, dual-band, hotspot',
        'commsBluetooth': '5.3, A2DP, LE',
        'commsNFC': 'Yes',
        'commsUSB': 'Lightning',
        'soundLoudspeaker': 'Yes, stereo speakers',
        'soundJack': 'No',
    },
    'iPhone 14 Pro': {
        'displaySize': '6.1 inches',
        'display': 'LTPO Super Retina XDR OLED',
        'displayResolution': '1179 x 2556 pixels',
        'displayProtection': 'Ceramic Shield glass',
        'displayFeatures': '120Hz, HDR10, Dolby Vision, 2000 nits peak',
        'chip': 'Apple A16 Bionic',
        'processor': 'Hexa-core',
        'cpu': '2x3.46GHz + 4x2.02GHz',
        'gpu': 'Apple GPU (5-core)',
        'ram': '6GB',
        'storageExpandable': 'No',
        'mainCamera': '48MP f/1.8',
        'mainCameraFeatures': 'Dual pixel PDAF, sensor-shift OIS, LED flash, 3x optical zoom',
        'mainCameraVideo': '4K@24/25/30/60fps, 1080p@25/30/60/120/240fps',
        'selfieCamera': '12MP f/1.9',
        'selfieCameraFeatures': 'PDAF, OIS, Face ID',
        'selfieCameraVideo': '4K@24/25/30/60fps, 1080p@25/30/60/120fps',
        'battery': '3200 mAh',
        'batteryCharging': 'Wired, MagSafe, Qi wireless',
        'batteryChargingSpeed': 'Wired 20W, Wireless 15W',
        'bodyDimensions': '147.5 x 71.5 x 7.9 mm',
        'bodyWeight': '206g',
        'bodyBuild': 'Glass front/back, Stainless steel frame',
        'bodySIM': 'Nano-SIM + eSIM',
        'bodyProtection': 'IP68 (water resistant 6m for 30 min)',
        'network': 'GSM/HSPA/LTE/5G',
        'commsWLAN': 'Wi-Fi 6, dual-band, hotspot',
        'commsBluetooth': '5.3, A2DP, LE',
        'commsNFC': 'Yes',
        'commsUSB': 'Lightning',
        'soundLoudspeaker': 'Yes, stereo speakers',
        'soundJack': 'No',
    },
    'iPhone 14 Pro Max': {
        'displaySize': '6.7 inches',
        'display': 'LTPO Super Retina XDR OLED',
        'displayResolution': '1290 x 2796 pixels',
        'displayProtection': 'Ceramic Shield glass',
        'displayFeatures': '120Hz, HDR10, Dolby Vision, 2000 nits peak',
        'chip': 'Apple A16 Bionic',
        'processor': 'Hexa-core',
        'cpu': '2x3.46GHz + 4x2.02GHz',
        'gpu': 'Apple GPU (5-core)',
        'ram': '6GB',
        'storageExpandable': 'No',
        'mainCamera': '48MP f/1.8',
        'mainCameraFeatures': 'Dual pixel PDAF, sensor-shift OIS, LED flash, 3x optical zoom',
        'mainCameraVideo': '4K@24/25/30/60fps, 1080p@25/30/60/120/240fps',
        'selfieCamera': '12MP f/1.9',
        'selfieCameraFeatures': 'PDAF, OIS, Face ID',
        'selfieCameraVideo': '4K@24/25/30/60fps, 1080p@25/30/60/120fps',
        'battery': '4323 mAh',
        'batteryCharging': 'Wired, MagSafe, Qi wireless',
        'batteryChargingSpeed': 'Wired 20W, Wireless 15W',
        'bodyDimensions': '160.7 x 77.6 x 7.9 mm',
        'bodyWeight': '240g',
        'bodyBuild': 'Glass front/back, Stainless steel frame',
        'bodySIM': 'Nano-SIM + eSIM',
        'bodyProtection': 'IP68 (water resistant 6m for 30 min)',
        'network': 'GSM/HSPA/LTE/5G',
        'commsWLAN': 'Wi-Fi 6, dual-band, hotspot',
        'commsBluetooth': '5.3, A2DP, LE',
        'commsNFC': 'Yes',
        'commsUSB': 'Lightning',
        'soundLoudspeaker': 'Yes, stereo speakers',
        'soundJack': 'No',
    },
    'iPhone 15': {
        'displaySize': '6.1 inches',
        'display': 'Super Retina XDR OLED',
        'displayResolution': '1179 x 2556 pixels',
        'displayProtection': 'Ceramic Shield glass',
        'displayFeatures': 'HDR10, Dolby Vision, 1000 nits peak',
        'chip': 'Apple A16 Bionic',
        'processor': 'Hexa-core',
        'cpu': '2x3.46GHz + 4x2.02GHz',
        'gpu': 'Apple GPU (5-core)',
        'ram': '6GB',
        'storageExpandable': 'No',
        'mainCamera': '48MP f/1.6 dual',
        'mainCameraFeatures': 'Sensor-shift OIS, LED flash, 2x optical zoom',
        'mainCameraVideo': '4K@24/25/30/60fps, 1080p@25/30/60/120/240fps',
        'selfieCamera': '12MP f/1.9',
        'selfieCameraFeatures': 'PDAF, OIS, Face ID',
        'selfieCameraVideo': '4K@24/25/30/60fps, 1080p@25/30/60/120fps',
        'battery': '3349 mAh',
        'batteryCharging': 'Wired, MagSafe, Qi2 wireless',
        'batteryChargingSpeed': 'Wired 20W, Wireless 15W',
        'bodyDimensions': '147.6 x 71.6 x 7.8 mm',
        'bodyWeight': '171g',
        'bodyBuild': 'Glass front/back, Aluminum frame',
        'bodySIM': 'Nano-SIM + eSIM',
        'bodyProtection': 'IP68 (water resistant 6m for 30 min)',
        'network': 'GSM/HSPA/LTE/5G',
        'commsWLAN': 'Wi-Fi 6, dual-band, hotspot',
        'commsBluetooth': '5.3, A2DP, LE',
        'commsNFC': 'Yes',
        'commsUSB': 'USB Type-C 2.0',
        'soundLoudspeaker': 'Yes, stereo speakers',
        'soundJack': 'No',
    },
    'iPhone 15 Plus': {
        'displaySize': '6.7 inches',
        'display': 'Super Retina XDR OLED',
        'displayResolution': '1290 x 2796 pixels',
        'displayProtection': 'Ceramic Shield glass',
        'displayFeatures': 'HDR10, Dolby Vision, 1000 nits peak',
        'chip': 'Apple A16 Bionic',
        'processor': 'Hexa-core',
        'cpu': '2x3.46GHz + 4x2.02GHz',
        'gpu': 'Apple GPU (5-core)',
        'ram': '6GB',
        'storageExpandable': 'No',
        'mainCamera': '48MP f/1.6 dual',
        'mainCameraFeatures': 'Sensor-shift OIS, LED flash, 2x optical zoom',
        'mainCameraVideo': '4K@24/25/30/60fps, 1080p@25/30/60/120/240fps',
        'selfieCamera': '12MP f/1.9',
        'selfieCameraFeatures': 'PDAF, OIS, Face ID',
        'selfieCameraVideo': '4K@24/25/30/60fps, 1080p@25/30/60/120fps',
        'battery': '4383 mAh',
        'batteryCharging': 'Wired, MagSafe, Qi2 wireless',
        'batteryChargingSpeed': 'Wired 20W, Wireless 15W',
        'bodyDimensions': '160.9 x 77.8 x 7.8 mm',
        'bodyWeight': '201g',
        'bodyBuild': 'Glass front/back, Aluminum frame',
        'bodySIM': 'Nano-SIM + eSIM',
        'bodyProtection': 'IP68 (water resistant 6m for 30 min)',
        'network': 'GSM/HSPA/LTE/5G',
        'commsWLAN': 'Wi-Fi 6, dual-band, hotspot',
        'commsBluetooth': '5.3, A2DP, LE',
        'commsNFC': 'Yes',
        'commsUSB': 'USB Type-C 2.0',
        'soundLoudspeaker': 'Yes, stereo speakers',
        'soundJack': 'No',
    },
    'iPhone 15 Pro': {
        'displaySize': '6.1 inches',
        'display': 'LTPO Super Retina XDR OLED',
        'displayResolution': '1179 x 2556 pixels',
        'displayProtection': 'Ceramic Shield glass',
        'displayFeatures': '120Hz, HDR10, Dolby Vision, 2000 nits peak',
        'chip': 'Apple A17 Pro',
        'processor': 'Hexa-core',
        'cpu': '2x3.78GHz + 4x2.11GHz',
        'gpu': 'Apple GPU (6-core)',
        'ram': '8GB',
        'storageExpandable': 'No',
        'mainCamera': '48MP f/1.8 triple',
        'mainCameraFeatures': 'Dual pixel PDAF, sensor-shift OIS, LiDAR, 3x optical zoom',
        'mainCameraVideo': '4K@24/25/30/60fps, 1080p@25/30/60/120/240fps',
        'selfieCamera': '12MP f/1.9',
        'selfieCameraFeatures': 'PDAF, OIS, Face ID',
        'selfieCameraVideo': '4K@24/25/30/60fps, 1080p@25/30/60/120fps',
        'battery': '3274 mAh',
        'batteryCharging': 'Wired, MagSafe, Qi2 wireless',
        'batteryChargingSpeed': 'Wired 20W, Wireless 15W',
        'bodyDimensions': '146.6 x 70.6 x 8.3 mm',
        'bodyWeight': '187g',
        'bodyBuild': 'Titanium frame, Glass back',
        'bodySIM': 'Nano-SIM + eSIM',
        'bodyProtection': 'IP68 (water resistant 6m for 30 min)',
        'network': 'GSM/HSPA/LTE/5G',
        'commsWLAN': 'Wi-Fi 6E, dual-band, hotspot',
        'commsBluetooth': '5.3, A2DP, LE',
        'commsNFC': 'Yes',
        'commsUSB': 'USB Type-C 3.2, DisplayPort',
        'soundLoudspeaker': 'Yes, stereo speakers',
        'soundJack': 'No',
    },
    'iPhone 15 Pro Max': {
        'displaySize': '6.7 inches',
        'display': 'LTPO Super Retina XDR OLED',
        'displayResolution': '1290 x 2796 pixels',
        'displayProtection': 'Ceramic Shield glass',
        'displayFeatures': '120Hz, HDR10, Dolby Vision, 2000 nits peak',
        'chip': 'Apple A17 Pro',
        'processor': 'Hexa-core',
        'cpu': '2x3.78GHz + 4x2.11GHz',
        'gpu': 'Apple GPU (6-core)',
        'ram': '8GB',
        'storageExpandable': 'No',
        'mainCamera': '48MP f/1.8 triple',
        'mainCameraFeatures': 'Dual pixel PDAF, sensor-shift OIS, LiDAR, 5x optical zoom',
        'mainCameraVideo': '4K@24/25/30/60fps, 1080p@25/30/60/120/240fps',
        'selfieCamera': '12MP f/1.9',
        'selfieCameraFeatures': 'PDAF, OIS, Face ID',
        'selfieCameraVideo': '4K@24/25/30/60fps, 1080p@25/30/60/120fps',
        'battery': '4441 mAh',
        'batteryCharging': 'Wired, MagSafe, Qi2 wireless',
        'batteryChargingSpeed': 'Wired 20W, Wireless 15W',
        'bodyDimensions': '159.9 x 76.7 x 8.3 mm',
        'bodyWeight': '221g',
        'bodyBuild': 'Titanium frame, Glass back',
        'bodySIM': 'Nano-SIM + eSIM',
        'bodyProtection': 'IP68 (water resistant 6m for 30 min)',
        'network': 'GSM/HSPA/LTE/5G',
        'commsWLAN': 'Wi-Fi 6E, dual-band, hotspot',
        'commsBluetooth': '5.3, A2DP, LE',
        'commsNFC': 'Yes',
        'commsUSB': 'USB Type-C 3.2, DisplayPort',
        'soundLoudspeaker': 'Yes, stereo speakers',
        'soundJack': 'No',
    },
    'iPhone 16e': {
        'displaySize': '6.1 inches',
        'display': 'Super Retina XDR OLED',
        'displayResolution': '1179 x 2556 pixels',
        'displayProtection': 'Ceramic Shield glass',
        'displayFeatures': 'HDR10, Dolby Vision, 800 nits',
        'chip': 'Apple A18',
        'processor': 'Hexa-core',
        'cpu': '2x4.04GHz + 4x2.20GHz',
        'gpu': 'Apple GPU (5-core)',
        'ram': '8GB',
        'storageExpandable': 'No',
        'mainCamera': '48MP f/1.6',
        'mainCameraFeatures': 'Sensor-shift OIS, LED flash, 2x optical zoom',
        'mainCameraVideo': '4K@24/25/30/60fps, 1080p@25/30/60/120/240fps',
        'selfieCamera': '12MP f/1.9',
        'selfieCameraFeatures': 'PDAF, OIS, Face ID',
        'selfieCameraVideo': '4K@24/25/30/60fps, 1080p@25/30/60/120fps',
        'battery': '3279 mAh',
        'batteryCharging': 'Wired, MagSafe, Qi2 wireless',
        'batteryChargingSpeed': 'Wired 20W, Wireless 15W',
        'bodyDimensions': '146.7 x 71.5 x 7.8 mm',
        'bodyWeight': '167g',
        'bodyBuild': 'Glass front/back, Aluminum frame',
        'bodySIM': 'Nano-SIM + eSIM',
        'bodyProtection': 'IP68 (water resistant 6m for 30 min)',
        'network': 'GSM/HSPA/LTE/5G',
        'commsWLAN': 'Wi-Fi 7, dual-band, hotspot',
        'commsBluetooth': '5.3, A2DP, LE',
        'commsNFC': 'Yes',
        'commsUSB': 'USB Type-C 2.0',
        'soundLoudspeaker': 'Yes, stereo speakers',
        'soundJack': 'No',
    },
    'iPhone 16': {
        'displaySize': '6.1 inches',
        'display': 'Super Retina XDR OLED',
        'displayResolution': '1179 x 2556 pixels',
        'displayProtection': 'Ceramic Shield glass',
        'displayFeatures': 'HDR10, Dolby Vision, 1000 nits peak',
        'chip': 'Apple A18',
        'processor': 'Hexa-core',
        'cpu': '2x4.04GHz + 4x2.20GHz',
        'gpu': 'Apple GPU (5-core)',
        'ram': '8GB',
        'storageExpandable': 'No',
        'mainCamera': '48MP f/1.6 dual',
        'mainCameraFeatures': 'Sensor-shift OIS, LED flash, 2x optical zoom',
        'mainCameraVideo': '4K@24/25/30/60fps, 1080p@25/30/60/120/240fps',
        'selfieCamera': '12MP f/1.9',
        'selfieCameraFeatures': 'PDAF, OIS, Face ID',
        'selfieCameraVideo': '4K@24/25/30/60fps, 1080p@25/30/60/120fps',
        'battery': '3561 mAh',
        'batteryCharging': 'Wired, MagSafe, Qi2 wireless',
        'batteryChargingSpeed': 'Wired 20W, Wireless 15W',
        'bodyDimensions': '147.6 x 71.6 x 7.8 mm',
        'bodyWeight': '170g',
        'bodyBuild': 'Glass front/back, Aluminum frame',
        'bodySIM': 'Nano-SIM + eSIM',
        'bodyProtection': 'IP68 (water resistant 6m for 30 min)',
        'network': 'GSM/HSPA/LTE/5G',
        'commsWLAN': 'Wi-Fi 7, dual-band, hotspot',
        'commsBluetooth': '5.3, A2DP, LE',
        'commsNFC': 'Yes',
        'commsUSB': 'USB Type-C 2.0',
        'soundLoudspeaker': 'Yes, stereo speakers',
        'soundJack': 'No',
    },
    'iPhone 16 Plus': {
        'displaySize': '6.7 inches',
        'display': 'Super Retina XDR OLED',
        'displayResolution': '1290 x 2796 pixels',
        'displayProtection': 'Ceramic Shield glass',
        'displayFeatures': 'HDR10, Dolby Vision, 1000 nits peak',
        'chip': 'Apple A18',
        'processor': 'Hexa-core',
        'cpu': '2x4.04GHz + 4x2.20GHz',
        'gpu': 'Apple GPU (5-core)',
        'ram': '8GB',
        'storageExpandable': 'No',
        'mainCamera': '48MP f/1.6 dual',
        'mainCameraFeatures': 'Sensor-shift OIS, LED flash, 2x optical zoom',
        'mainCameraVideo': '4K@24/25/30/60fps, 1080p@25/30/60/120/240fps',
        'selfieCamera': '12MP f/1.9',
        'selfieCameraFeatures': 'PDAF, OIS, Face ID',
        'selfieCameraVideo': '4K@24/25/30/60fps, 1080p@25/30/60/120fps',
        'battery': '4674 mAh',
        'batteryCharging': 'Wired, MagSafe, Qi2 wireless',
        'batteryChargingSpeed': 'Wired 20W, Wireless 15W',
        'bodyDimensions': '160.9 x 77.8 x 7.8 mm',
        'bodyWeight': '199g',
        'bodyBuild': 'Glass front/back, Aluminum frame',
        'bodySIM': 'Nano-SIM + eSIM',
        'bodyProtection': 'IP68 (water resistant 6m for 30 min)',
        'network': 'GSM/HSPA/LTE/5G',
        'commsWLAN': 'Wi-Fi 7, dual-band, hotspot',
        'commsBluetooth': '5.3, A2DP, LE',
        'commsNFC': 'Yes',
        'commsUSB': 'USB Type-C 2.0',
        'soundLoudspeaker': 'Yes, stereo speakers',
        'soundJack': 'No',
    },
    'iPhone 16 Pro': {
        'displaySize': '6.3 inches',
        'display': 'LTPO Super Retina XDR OLED',
        'displayResolution': '1206 x 2622 pixels',
        'displayProtection': 'Ceramic Shield glass',
        'displayFeatures': '120Hz, HDR10, Dolby Vision, 2000 nits peak',
        'chip': 'Apple A18 Pro',
        'processor': 'Hexa-core',
        'cpu': '2x4.04GHz + 4x2.20GHz',
        'gpu': 'Apple GPU (6-core)',
        'ram': '8GB',
        'storageExpandable': 'No',
        'mainCamera': '48MP f/1.8 triple',
        'mainCameraFeatures': 'Dual pixel PDAF, sensor-shift OIS, LiDAR, 5x optical zoom',
        'mainCameraVideo': '4K@24/25/30/60/120fps, 1080p@25/30/60/120/240fps',
        'selfieCamera': '12MP f/1.9',
        'selfieCameraFeatures': 'PDAF, OIS, Face ID',
        'selfieCameraVideo': '4K@24/25/30/60fps, 1080p@25/30/60/120fps',
        'battery': '3582 mAh',
        'batteryCharging': 'Wired, MagSafe, Qi2 wireless',
        'batteryChargingSpeed': 'Wired 27W, Wireless 15W',
        'bodyDimensions': '149.6 x 71.5 x 8.3 mm',
        'bodyWeight': '199g',
        'bodyBuild': 'Titanium frame, Glass back',
        'bodySIM': 'Nano-SIM + eSIM',
        'bodyProtection': 'IP68 (water resistant 6m for 30 min)',
        'network': 'GSM/HSPA/LTE/5G',
        'commsWLAN': 'Wi-Fi 7, dual-band, hotspot',
        'commsBluetooth': '5.3, A2DP, LE',
        'commsNFC': 'Yes',
        'commsUSB': 'USB Type-C 3.2, DisplayPort',
        'soundLoudspeaker': 'Yes, stereo speakers',
        'soundJack': 'No',
    },
    'iPhone 16 Pro Max': {
        'displaySize': '6.9 inches',
        'display': 'LTPO Super Retina XDR OLED',
        'displayResolution': '1320 x 2868 pixels',
        'displayProtection': 'Ceramic Shield glass',
        'displayFeatures': '120Hz, HDR10, Dolby Vision, 2000 nits peak',
        'chip': 'Apple A18 Pro',
        'processor': 'Hexa-core',
        'cpu': '2x4.04GHz + 4x2.20GHz',
        'gpu': 'Apple GPU (6-core)',
        'ram': '8GB',
        'storageExpandable': 'No',
        'mainCamera': '48MP f/1.8 triple',
        'mainCameraFeatures': 'Dual pixel PDAF, sensor-shift OIS, LiDAR, 5x optical zoom',
        'mainCameraVideo': '4K@24/25/30/60/120fps, 1080p@25/30/60/120/240fps',
        'selfieCamera': '12MP f/1.9',
        'selfieCameraFeatures': 'PDAF, OIS, Face ID',
        'selfieCameraVideo': '4K@24/25/30/60fps, 1080p@25/30/60/120fps',
        'battery': '4685 mAh',
        'batteryCharging': 'Wired, MagSafe, Qi2 wireless',
        'batteryChargingSpeed': 'Wired 27W, Wireless 15W',
        'bodyDimensions': '163 x 77.6 x 8.3 mm',
        'bodyWeight': '227g',
        'bodyBuild': 'Titanium frame, Glass back',
        'bodySIM': 'Nano-SIM + eSIM',
        'bodyProtection': 'IP68 (water resistant 6m for 30 min)',
        'network': 'GSM/HSPA/LTE/5G',
        'commsWLAN': 'Wi-Fi 7, dual-band, hotspot',
        'commsBluetooth': '5.3, A2DP, LE',
        'commsNFC': 'Yes',
        'commsUSB': 'USB Type-C 3.2, DisplayPort',
        'soundLoudspeaker': 'Yes, stereo speakers',
        'soundJack': 'No',
    },
    'iPhone 17': {
        'displaySize': '6.3 inches',
        'display': 'Super Retina XDR OLED',
        'displayResolution': '1206 x 2622 pixels',
        'displayProtection': 'Ceramic Shield glass',
        'displayFeatures': 'HDR10, Dolby Vision, 1000 nits peak',
        'chip': 'Apple A19',
        'processor': 'Hexa-core',
        'cpu': '2x4.20GHz + 4x2.40GHz',
        'gpu': 'Apple GPU (6-core)',
        'ram': '8GB',
        'storageExpandable': 'No',
        'mainCamera': '48MP f/1.6 dual',
        'mainCameraFeatures': 'Sensor-shift OIS, LED flash, 2x optical zoom',
        'mainCameraVideo': '4K@24/25/30/60fps, 1080p@25/30/60/120/240fps',
        'selfieCamera': '12MP f/1.9',
        'selfieCameraFeatures': 'PDAF, OIS, Face ID',
        'selfieCameraVideo': '4K@24/25/30/60fps, 1080p@25/30/60/120fps',
        'battery': '3600 mAh',
        'batteryCharging': 'Wired, MagSafe, Qi2 wireless',
        'batteryChargingSpeed': 'Wired 25W, Wireless 15W',
        'bodyDimensions': '149.6 x 71.5 x 7.8 mm',
        'bodyWeight': '175g',
        'bodyBuild': 'Glass front/back, Aluminum frame',
        'bodySIM': 'Nano-SIM + eSIM',
        'bodyProtection': 'IP68 (water resistant 6m for 30 min)',
        'network': 'GSM/HSPA/LTE/5G',
        'commsWLAN': 'Wi-Fi 7, dual-band, hotspot',
        'commsBluetooth': '5.3, A2DP, LE',
        'commsNFC': 'Yes',
        'commsUSB': 'USB Type-C 2.0',
        'soundLoudspeaker': 'Yes, stereo speakers',
        'soundJack': 'No',
    },
    'iPhone 17 Pro': {
        'displaySize': '6.3 inches',
        'display': 'LTPO Super Retina XDR OLED',
        'displayResolution': '1206 x 2622 pixels',
        'displayProtection': 'Ceramic Shield glass',
        'displayFeatures': '120Hz, HDR10, Dolby Vision, 2000 nits peak',
        'chip': 'Apple A19 Pro',
        'processor': 'Hexa-core',
        'cpu': '2x4.20GHz + 4x2.40GHz',
        'gpu': 'Apple GPU (6-core)',
        'ram': '12GB',
        'storageExpandable': 'No',
        'mainCamera': '48MP f/1.8 triple',
        'mainCameraFeatures': 'Dual pixel PDAF, sensor-shift OIS, LiDAR, 5x optical zoom',
        'mainCameraVideo': '4K@24/25/30/60/120fps, 1080p@25/30/60/120/240fps',
        'selfieCamera': '12MP f/1.9',
        'selfieCameraFeatures': 'PDAF, OIS, Face ID',
        'selfieCameraVideo': '4K@24/25/30/60fps, 1080p@25/30/60/120fps',
        'battery': '3800 mAh',
        'batteryCharging': 'Wired, MagSafe, Qi2 wireless',
        'batteryChargingSpeed': 'Wired 35W, Wireless 15W',
        'bodyDimensions': '149.6 x 71.5 x 8.3 mm',
        'bodyWeight': '205g',
        'bodyBuild': 'Titanium frame, Glass back',
        'bodySIM': 'Nano-SIM + eSIM',
        'bodyProtection': 'IP68 (water resistant 6m for 30 min)',
        'network': 'GSM/HSPA/LTE/5G',
        'commsWLAN': 'Wi-Fi 7, dual-band, hotspot',
        'commsBluetooth': '5.3, A2DP, LE',
        'commsNFC': 'Yes',
        'commsUSB': 'USB Type-C 3.2, DisplayPort',
        'soundLoudspeaker': 'Yes, stereo speakers',
        'soundJack': 'No',
    },
    'iPhone 17 Pro Max': {
        'displaySize': '6.9 inches',
        'display': 'LTPO Super Retina XDR OLED',
        'displayResolution': '1320 x 2868 pixels',
        'displayProtection': 'Ceramic Shield glass',
        'displayFeatures': '120Hz, HDR10, Dolby Vision, 2000 nits peak',
        'chip': 'Apple A19 Pro',
        'processor': 'Hexa-core',
        'cpu': '2x4.20GHz + 4x2.40GHz',
        'gpu': 'Apple GPU (6-core)',
        'ram': '12GB',
        'storageExpandable': 'No',
        'mainCamera': '48MP f/1.8 triple',
        'mainCameraFeatures': 'Dual pixel PDAF, sensor-shift OIS, LiDAR, 5x optical zoom',
        'mainCameraVideo': '4K@24/25/30/60/120fps, 1080p@25/30/60/120/240fps',
        'selfieCamera': '12MP f/1.9',
        'selfieCameraFeatures': 'PDAF, OIS, Face ID',
        'selfieCameraVideo': '4K@24/25/30/60fps, 1080p@25/30/60/120fps',
        'battery': '5000 mAh',
        'batteryCharging': 'Wired, MagSafe, Qi2 wireless',
        'batteryChargingSpeed': 'Wired 35W, Wireless 15W',
        'bodyDimensions': '163 x 77.6 x 8.3 mm',
        'bodyWeight': '230g',
        'bodyBuild': 'Titanium frame, Glass back',
        'bodySIM': 'Nano-SIM + eSIM',
        'bodyProtection': 'IP68 (water resistant 6m for 30 min)',
        'network': 'GSM/HSPA/LTE/5G',
        'commsWLAN': 'Wi-Fi 7, dual-band, hotspot',
        'commsBluetooth': '5.3, A2DP, LE',
        'commsNFC': 'Yes',
        'commsUSB': 'USB Type-C 3.2, DisplayPort',
        'soundLoudspeaker': 'Yes, stereo speakers',
        'soundJack': 'No',
    },
}

# Generic accessory specs
ACCESSORY_SPECS = {
    'speaker': {
        'type': 'Bluetooth Speaker',
        'soundLoudspeaker': 'Yes, stereo',
        'soundJack': 'No',
        'commsBluetooth': '5.0+',
        'batteryLife': 'Up to 12 hours',
        'batteryCharging': 'USB-C',
    },
    'powerbank': {
        'type': 'Power Bank',
        'batteryCharging': 'USB-C, Wireless',
        'commsUSB': 'USB-C PD',
    },
    'smartwatch': {
        'type': 'Smartwatch',
        'display': 'AMOLED Touch',
        'commsBluetooth': '5.0+',
        'batteryLife': 'Up to 7 days',
        'batteryCharging': 'Magnetic charger',
    },
    'charger': {
        'type': 'Wireless Charger',
        'batteryCharging': 'Wireless + USB-C',
        'commsUSB': 'USB-C',
    },
    'console': {
        'type': 'Gaming Console',
        'processor': 'Custom AMD APU',
        'storage': '1TB SSD',
        'support': '4K 120Hz, Ray Tracing',
    },
    'vr': {
        'type': 'VR Headset',
        'display': 'LCD / OLED',
        'processor': 'Snapdragon XR',
        'storage': '128GB',
    },
}


def slugify(text):
    return re.sub(r'[^\w\s-]', '', text).strip().replace(' ', '-').lower()[:50]


def get_iphone_model(title):
    """Extract iPhone model name from title like 'Apple iPhone 15 Plus - Unlocked'"""
    m = re.search(r'iPhone\s+([\w\s]+?)(?:\s+-\s+|$)', title)
    if m:
        return 'iPhone ' + m.group(1).strip()
    return title


def get_category(title, handle):
    lower = title.lower()
    hlower = handle.lower()
    if 'iphone' in lower or 'ipad' in lower:
        return 'Phones'
    if 'playstation' in lower or 'nintendo' in lower:
        return 'Playables'
    if 'quest' in lower or 'vr' in lower or 'headset' in lower:
        return 'Playables'
    if 'speaker' in lower:
        return 'Speakers'
    if 'headphone' in lower or 'earbud' in lower:
        return 'Hearables'
    if 'watch' in lower:
        return 'Accessories'
    if 'powerbank' in lower or 'power bank' in lower:
        return 'Accessories'
    if 'charger' in lower or 'charging' in lower:
        return 'Accessories'
    return 'Accessories'


def get_accessory_specs(title):
    lower = title.lower()
    if 'speaker' in lower:
        return ACCESSORY_SPECS['speaker']
    if 'powerbank' in lower or 'power bank' in lower:
        return ACCESSORY_SPECS['powerbank']
    if 'watch' in lower:
        return ACCESSORY_SPECS['smartwatch']
    if 'charger' in lower or 'charging' in lower:
        return ACCESSORY_SPECS['charger']
    if 'playstation' in lower or 'nintendo' in lower:
        return ACCESSORY_SPECS['console']
    if 'quest' in lower:
        return ACCESSORY_SPECS['vr']
    return ACCESSORY_SPECS['speaker']


def get_battery_health(condition):
    if condition == 'Brand New':
        return 100
    if condition == 'Premium':
        return 98
    if condition == 'Excellent':
        return 92
    if condition == 'Good':
        return 85
    if condition == 'New':
        return 100
    return 90


def format_ts_value(v):
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, (int, float)):
        return str(v)
    return json.dumps(v)


def write_ts_object(d, indent=4):
    lines = []
    for k, v in d.items():
        if v is None:
            continue
        if isinstance(v, dict):
            lines.append(' ' * indent + f'{k}: {{')
            lines.append(write_ts_object(v, indent + 2))
            lines.append(' ' * indent + '},')
        elif isinstance(v, list):
            items = []
            for item in v:
                if isinstance(item, dict):
                    item_lines = ['{']
                    for ik, iv in item.items():
                        item_lines.append(' ' * (indent + 4) + f'{ik}: {format_ts_value(iv)},')
                    item_lines.append(' ' * (indent + 2) + '}')
                    items.append('\n'.join(item_lines))
                else:
                    items.append(format_ts_value(item))
            list_content = ',\n'.join(items)
            lines.append(' ' * indent + f'{k}: [')
            lines.append(list_content)
            lines.append(' ' * indent + '],')
        else:
            lines.append(' ' * indent + f'{k}: {format_ts_value(v)},')
    return '\n'.join(lines)


def main():
    # Parse CSV
    products_raw = defaultdict(lambda: {'title': '', 'variants': []})
    with open(r'C:\Users\Manikanta Sridhar M\Downloads\inventory_export_1.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            handle = row['Handle'].strip()
            if not handle:
                continue
            products_raw[handle]['title'] = row['Title'].strip()
            products_raw[handle]['variants'].append({
                'capacity': row.get('Option1 Value', '').strip(),
                'color': row.get('Option2 Value', '').strip(),
                'condition': row.get('Option3 Value', '').strip(),
            })

    ts_products = []

    for handle, data in products_raw.items():
        title = data['title']
        variants = data['variants']

        # Determine product type
        is_iphone = 'iphone' in title.lower()
        category = get_category(title, handle)

        if is_iphone:
            model_name = get_iphone_model(title)
            brand = 'Apple'
            specs_template = IPHONE_SPECS.get(model_name, {})

            # Collect unique options
            capacities = sorted(set(v['capacity'] for v in variants if v['capacity'] and v['capacity'] != 'Default Title'))
            colors = sorted(set(v['color'] for v in variants if v['color']))
            conditions = sorted(set(v['condition'] for v in variants if v['condition']))

            # Build variants
            product_variants = []
            all_prices = []
            for v in variants:
                cap = v['capacity']
                cond = v['condition']
                color = v['color']
                if not cap or cap == 'Default Title':
                    cap = capacities[0] if capacities else '128GB'
                if not cond:
                    cond = 'Excellent'

                retail = IPHONE_RETAIL.get(model_name, {}).get(cap, 999)
                mult = CONDITION_MULT.get(cond, 0.65)
                price = round(retail * mult)
                all_prices.append(price)

                product_variants.append({
                    'id': f"{slugify(handle)}-{slugify(cap)}-{slugify(cond)}-{slugify(color or 'default')}",
                    'color': color if color else None,
                    'storage': cap,
                    'condition': GRADE_MAP.get(cond, 'Good'),
                    'price': price,
                    'originalPrice': retail,
                    'stock': max(1, hash(handle + cap + cond) % 15 + 1),
                })

            # Base product takes cheapest variant
            base_price = min(all_prices) if all_prices else 499
            base_original = IPHONE_RETAIL.get(model_name, {}).get(capacities[0] if capacities else '128GB', 999)
            base_grade = 'Good'
            base_storage = capacities[0] if capacities else '128GB'

            # Use first available color for image
            base_color = colors[0] if colors else 'Black'

            product = {
                'id': handle,
                'model': model_name,
                'brand': brand,
                'category': category,
                'storage': base_storage,
                'price': base_price,
                'originalPrice': base_original,
                'grade': base_grade,
                'batteryHealth': 90,
                'warrantyMonths': 12,
                'returnDays': 30,
                'imageUrl': f'/assets/{slugify(handle)}.png',
                'isCertified': True,
                'stock': sum(v['stock'] for v in product_variants),
                'specs': specs_template,
                'colorOptions': colors if colors else None,
                'storageOptions': capacities if capacities else None,
                'conditionOptions': sorted(set(GRADE_MAP.get(c, 'Good') for c in conditions)) if conditions else None,
                'variants': product_variants,
            }
            ts_products.append(product)

        else:
            # Accessory / non-iPhone product
            brand = title.split()[0] if title else 'VIDVIE'
            if 'playstation' in title.lower():
                brand = 'Sony'
            elif 'nintendo' in title.lower():
                brand = 'Nintendo'
            elif 'meta' in title.lower():
                brand = 'Meta'

            specs = get_accessory_specs(title)

            # Estimate price based on title keywords
            price = 49
            original = 79
            if '150w' in title.lower() or 'party' in title.lower():
                price, original = 89, 149
            elif 'speaker' in title.lower():
                price, original = 45, 79
            elif 'powerbank' in title.lower() or 'power bank' in title.lower():
                if '10000' in title:
                    price, original = 29, 49
                elif '5000' in title.lower():
                    price, original = 19, 35
                else:
                    price, original = 25, 45
            elif 'watch' in title.lower():
                price, original = 39, 69
            elif 'playstation 5' in title.lower():
                price, original = 429, 479
            elif 'nintendo' in title.lower():
                price, original = 259, 299
            elif 'quest' in title.lower():
                price, original = 275, 299
            elif 'charger' in title.lower() or 'charging' in title.lower():
                price, original = 35, 59

            product = {
                'id': handle,
                'model': title,
                'brand': brand,
                'category': category,
                'price': price,
                'originalPrice': original,
                'grade': 'New',
                'batteryHealth': 100,
                'warrantyMonths': 12,
                'returnDays': 30,
                'imageUrl': f'/assets/{slugify(handle)}.png',
                'isCertified': True,
                'stock': max(3, hash(handle) % 20 + 3),
                'specs': specs,
            }
            ts_products.append(product)

    # Write output
    output_lines = [
        "import { Product, Category } from './types';",
        "",
        "export const MOCK_PHONES: Product[] = [",
    ]

    for p in ts_products:
        output_lines.append("  {")
        output_lines.append(write_ts_object(p, indent=4))
        output_lines.append("  },")

    output_lines.append("];")
    output_lines.append("")

    # Categories with updated counts
    cat_counts = defaultdict(int)
    for p in ts_products:
        cat_counts[p['category']] += 1

    output_lines.append("export const MOCK_CATEGORIES: Category[] = [")
    cat_defs = [
        ('apple', 'Apple', 'Latest iPhones and refurbished Apple devices', 'Phones'),
        ('samsung', 'Samsung', 'Samsung Galaxy smartphones and accessories', 'Phones'),
        ('google', 'Google', 'Google Pixel phones and smart technology', 'Phones'),
        ('tablets', 'Ipads & Tabs', 'iPads and Android tablets for work and play', 'Tablets'),
        ('accessories', 'Accessories', 'Cases, chargers, and essential mobile add-ons', 'Accessories'),
        ('speakers', 'Speakers', 'Bluetooth and portable speakers for every occasion', 'Speakers'),
        ('hearables', 'Hearables', 'High-quality headphones and wireless earbuds', 'Hearables'),
        ('playables', 'Playables', 'Gaming consoles, VR headsets, and interactive gear', 'Playables'),
    ]
    for cid, name, desc, match_cat in cat_defs:
        count = cat_counts.get(match_cat, 0)
        # Apple count is all Apple brand products
        if cid == 'apple':
            count = sum(1 for p in ts_products if p.get('brand') == 'Apple')
        img = f'/assets/{cid}.png' if cid in ('apple', 'samsung', 'google') else f'/assets/{cid}.svg'
        output_lines.append("  {")
        output_lines.append(f"    id: '{cid}',")
        output_lines.append(f"    name: '{name}',")
        output_lines.append(f"    imageUrl: '{img}',")
        output_lines.append(f"    description: '{desc}',")
        output_lines.append(f"    productCount: {count},")
        output_lines.append("  },")
    output_lines.append("];")

    with open('src/data.ts', 'w', encoding='utf-8') as f:
        f.write('\n'.join(output_lines))

    print(f'Generated {len(ts_products)} products in src/data.ts')


if __name__ == '__main__':
    main()
