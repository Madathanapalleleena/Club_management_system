require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User     = require('./models/User');
const Director = require('./models/Director');
const { Vendor, AgreementTemplate } = require('./models/Vendor');
const { Room }  = require('./models/RoomModels');
const { Item }  = require('./models/StoreModels');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Wipe all collections
  await Promise.all([
    User.deleteMany({}), Director.deleteMany({}),
    Vendor.deleteMany({}), AgreementTemplate.deleteMany({}),
    Room.deleteMany({}), Item.deleteMany({}),
    require('./models/BanquetBooking').deleteMany({}),
    require('./models/RoomModels').RoomBooking.deleteMany({}),
    require('./models/Notification').deleteMany({}),
    require('./models/ProcurementRequest').deleteMany({}),
    require('./models/PurchaseOrder').deleteMany({}),
    require('./models/StoreModels').GRC.deleteMany({}),
    require('./models/StoreModels').InternalRequest.deleteMany({}),
    require('./models/StoreModels').StockTxn.deleteMany({}),
    require('./models/Finance').Sale.deleteMany({}),
    require('./models/Finance').Expense.deleteMany({}),
  ]);
  console.log('Collections cleared');

  // ── Users ──────────────────────────────────────────────────────
  const pw = await bcrypt.hash('Admin@123', 12);
  const users = await User.create([
    { name:'Rajesh Kumar',      email:'chairman@club.com',    password:pw, role:'chairman',              department:'management' },
    { name:'Priya Sharma',      email:'secretary@club.com',   password:pw, role:'secretary',             department:'management' },
    { name:'Arun Mehta',        email:'gm@club.com',          password:pw, role:'gm',                   department:'management' },
    { name:'Deepak Verma',      email:'agm@club.com',         password:pw, role:'agm',                  department:'management' },
    { name:'Suresh Nair',       email:'procurement@club.com', password:pw, role:'procurement_manager',  department:'procurement' },
    { name:'Kavya Reddy',       email:'procasst@club.com',    password:pw, role:'procurement_assistant',department:'procurement' },
    { name:'Ramesh Pillai',     email:'store@club.com',       password:pw, role:'store_manager',        department:'store' },
    { name:'Anitha Joseph',     email:'storeasst@club.com',   password:pw, role:'store_assistant',      department:'store' },
    { name:'Chef Venkat',       email:'kitchen@club.com',     password:pw, role:'kitchen_manager',      department:'kitchen' },
    { name:'Meena Krishnan',    email:'foodctrl@club.com',    password:pw, role:'food_control',         department:'kitchen' },
    { name:'Lakshmi Iyer',      email:'accounts@club.com',    password:pw, role:'accounts_manager',     department:'accounts' },
    { name:'Vinod Shetty',      email:'hr@club.com',          password:pw, role:'hr_manager',           department:'hr' },
    { name:'Santosh Rao',       email:'banquet@club.com',     password:pw, role:'banquet_manager',      department:'banquet' },
    { name:'Harini Bhat',       email:'rooms@club.com',       password:pw, role:'rooms_manager',        department:'rooms' },
    { name:'Ajay Menon',        email:'bar@club.com',         password:pw, role:'bar_manager',          department:'bar' },
    { name:'Latha Naidu',       email:'sports@club.com',      password:pw, role:'sports_manager',       department:'sports' },
    { name:'Ravi Shankar',      email:'maintenance@club.com', password:pw, role:'maintenance_manager',  department:'maintenance' },
    // Directors (login accounts — one per committee)
    { name:'Dr. Anand Krishnamurthy', email:'director.food@club.com',    password:pw, role:'director', department:'food_committee' },
    { name:'Col. Pradeep Nambiar',    email:'director.sports@club.com',  password:pw, role:'director', department:'sports' },
    { name:'Smt. Rekha Menon',        email:'director.rooms@club.com',   password:pw, role:'director', department:'rooms_banquets' },
    { name:'Mr. Sunil Acharya',       email:'director.general@club.com', password:pw, role:'director', department:'general' },
  ]);
  console.log(`Users: ${users.length} created`);

  const chairman   = users[0];
  const secretary  = users[1];
  const gm         = users[2];
  const procMgr    = users[4];
  const storeMgr   = users[6];
  const kitchMgr   = users[8];
  const acctMgr    = users[10];
  const banqMgr    = users[12];
  const roomsMgr   = users[13];

  // ── Directors ─────────────────────────────────────────────────
  await Director.create([
    { committeeName:'Food & Beverage Committee', name:'Dr. Anand Krishnamurthy', department:'food_committee', mobile:'9876543201', email:'anand.k@club.com', memberId:'DIR001', createdBy:chairman._id },
    { committeeName:'Sports & Recreation',       name:'Col. Pradeep Nambiar',    department:'sports',         mobile:'9876543202', email:'pradeep.n@club.com', memberId:'DIR002', createdBy:chairman._id },
    { committeeName:'Rooms & Banquets',          name:'Smt. Rekha Menon',        department:'rooms_banquets', mobile:'9876543203', email:'rekha.m@club.com', memberId:'DIR003', createdBy:chairman._id },
    { committeeName:'General Administration',    name:'Mr. Sunil Acharya',       department:'general',        mobile:'9876543204', email:'sunil.a@club.com', memberId:'DIR004', createdBy:chairman._id },
  ]);
  console.log('Directors seeded');

  // ── Agreement Templates ───────────────────────────────────────
  const templates = await AgreementTemplate.create([
    {
      name: 'Standard Food Supply Agreement',
      vendorType: 'wholesale',
      categories: ['Vegetables','Grains','Dairy','Fruits'],
      products: ['Rice','Wheat','Vegetables','Fruits','Dairy'],
      placeholders: ['{{VENDOR_NAME}}','{{SHOP_NAME}}','{{VENDOR_TYPE}}','{{PRODUCTS}}','{{DATE}}'],
      content: `VENDOR SUPPLY AGREEMENT

This Agreement is entered into on {{DATE}}

BETWEEN:
The Club Management ("Club")
AND
{{VENDOR_NAME}} trading as {{SHOP_NAME}} ("Vendor")

VENDOR DETAILS:
- Vendor Type: {{VENDOR_TYPE}}
- Products Supplied: {{PRODUCTS}}
- Address: {{VENDOR_ADDRESS}}
- GST Number: {{VENDOR_GST}}

TERMS AND CONDITIONS:
1. SUPPLY COMMITMENT
   The Vendor agrees to supply the following products: {{PRODUCTS}}
   Supply shall be regular and uninterrupted as per Club requirements.

2. QUALITY STANDARDS
   All products must meet FSSAI standards and Club quality specifications.
   The Club reserves the right to reject substandard products.

3. PRICING
   Prices shall be mutually agreed and reviewed quarterly.
   Any price changes require 15 days written notice.

4. PAYMENT TERMS
   Payment within 30 days of invoice receipt and GRC approval.
   Advance payments as per mutually agreed terms.

5. DELIVERY
   Deliveries as per Club schedule. Emergency supplies within 4 hours.

6. DURATION
   This agreement is valid for one year from the date above.

SIGNATURES:
Club Representative: _____________________ Date: _______
Vendor Representative: __________________ Date: _______`,
      isDefault: true,
      createdBy: procMgr._id,
    },
    {
      name: 'Beverage & Liquor Supply Agreement',
      vendorType: 'distributor',
      categories: ['Beverages','Spirits','Beer','Wine'],
      products: ['Whisky','Rum','Beer','Wine','Soft Drinks'],
      placeholders: ['{{VENDOR_NAME}}','{{SHOP_NAME}}','{{PRODUCTS}}','{{DATE}}'],
      content: `BEVERAGE SUPPLY AGREEMENT

This Agreement is entered into on {{DATE}}

BETWEEN: The Club AND {{VENDOR_NAME}} ({{SHOP_NAME}})

Products: {{PRODUCTS}}

TERMS:
1. Licensed supply of alcohol and beverages as per Excise regulations
2. All deliveries with valid invoices and excise documents
3. Credit period: 15 days
4. Returns policy: Damaged goods replaced within 48 hours
5. Pricing: Fixed for 6 months, revised biannually

Signed: Club _____________ Vendor _____________ Date: _______`,
      createdBy: procMgr._id,
    },
    {
      name: 'General Service Agreement',
      vendorType: 'all',
      categories: ['Cleaning','Stationery','Equipment','Maintenance'],
      products: ['Cleaning Supplies','Stationery','Equipment'],
      placeholders: ['{{VENDOR_NAME}}','{{PRODUCTS}}','{{DATE}}'],
      content: `GENERAL SUPPLY AGREEMENT

Date: {{DATE}}
Vendor: {{VENDOR_NAME}}
Products/Services: {{PRODUCTS}}

Standard terms apply:
- Quality guarantee
- Timely delivery
- Invoice-based payment within 45 days
- Dispute resolution via arbitration

Signatures: _________________________`,
      createdBy: procMgr._id,
    },
  ]);
  console.log(`Agreement templates: ${templates.length} created`);

  // ── Vendors ───────────────────────────────────────────────────
  const vendors = await Vendor.create([
    {
      name: 'Krishnamurthy Raj',
      shopName: 'Sri Balaji Vegetables',
      address: 'APMC Market, Hyderabad',
      mobile: '9876543210',
      email: 'balaji.veg@email.com',
      vendorType: 'wholesale',
      category: 'Vegetables & Fruits',
      products: ['Tomatoes','Onions','Potatoes','Carrots','Leafy Vegetables','Fruits'],
      rating: 4.5,
      createdBy: procMgr._id,
    },
    {
      name: 'Mohammed Farooq',
      shopName: 'Al-Ameen Dairy Products',
      address: 'Dairy Colony, Secunderabad',
      mobile: '9876543211',
      vendorType: 'wholesale',
      category: 'Dairy',
      products: ['Milk','Curd','Paneer','Butter','Ghee'],
      rating: 4.2,
      createdBy: procMgr._id,
    },
    {
      name: 'Venkat Rao',
      shopName: 'Deccan Beverages',
      address: 'HITEC City, Hyderabad',
      mobile: '9876543212',
      gstNumber: '36ABCDE1234F1Z5',
      vendorType: 'distributor',
      category: 'Beverages',
      products: ['Beer','Soft Drinks','Juices','Water'],
      rating: 4.0,
      createdBy: procMgr._id,
    },
    {
      name: 'Ravi Kumar',
      shopName: 'Hyderabad Rice Traders',
      address: 'Begum Bazaar, Hyderabad',
      mobile: '9876543213',
      vendorType: 'wholesale',
      category: 'Grains',
      products: ['Basmati Rice','Wheat Flour','Rava','Maida','Dal'],
      rating: 4.7,
      createdBy: procMgr._id,
    },
  ]);
  console.log(`Vendors: ${vendors.length} created`);

  // ── Rooms ─────────────────────────────────────────────────────
  await Room.create([
    { roomNumber:'101', roomType:'Standard',       pricePerNight:2500,  capacity:2, floor:'1', status:'available',    amenities:['WiFi','AC','TV','Hot Water'],        createdBy:roomsMgr._id },
    { roomNumber:'102', roomType:'Standard',       pricePerNight:2500,  capacity:2, floor:'1', status:'available',    amenities:['WiFi','AC','TV','Hot Water'],        createdBy:roomsMgr._id },
    { roomNumber:'103', roomType:'Standard',       pricePerNight:2500,  capacity:2, floor:'1', status:'maintenance',  amenities:['WiFi','AC','TV'],                    createdBy:roomsMgr._id },
    { roomNumber:'201', roomType:'Deluxe',         pricePerNight:4500,  capacity:3, floor:'2', status:'available',    amenities:['WiFi','AC','TV','Mini Bar','Sofa'],  createdBy:roomsMgr._id },
    { roomNumber:'202', roomType:'Deluxe',         pricePerNight:4500,  capacity:3, floor:'2', status:'available',    amenities:['WiFi','AC','TV','Mini Bar','Sofa'],  createdBy:roomsMgr._id },
    { roomNumber:'301', roomType:'Suite',          pricePerNight:8500,  capacity:4, floor:'3', status:'available',    amenities:['WiFi','AC','TV','Mini Bar','Jacuzzi','Balcony'], createdBy:roomsMgr._id },
    { roomNumber:'302', roomType:'Suite',          pricePerNight:8500,  capacity:4, floor:'3', status:'available',    amenities:['WiFi','AC','TV','Mini Bar','Jacuzzi','Balcony'], createdBy:roomsMgr._id },
    { roomNumber:'401', roomType:'Family Room',    pricePerNight:5500,  capacity:5, floor:'4', status:'available',    amenities:['WiFi','AC','TV','2 Beds','Kitchen'], createdBy:roomsMgr._id },
    { roomNumber:'501', roomType:'Presidential Suite', pricePerNight:18000,capacity:6,floor:'5',status:'available',  amenities:['WiFi','AC','4K TV','Bar','Jacuzzi','Butler Service','Dining Room'], createdBy:roomsMgr._id },
  ]);
  console.log('Rooms seeded');

  // ── Store Items ────────────────────────────────────────────────
  await Item.create([
    { name:'Basmati Rice',        itemType:'raw material',  category:'Grains',      quantity:150, unit:'kg',     unitPrice:85,   thresholdValue:50,  department:'kitchen', location:'Dry Store A',  createdBy:storeMgr._id, lastPurchased:new Date(Date.now()-7*86400000) },
    { name:'Wheat Flour (Maida)', itemType:'raw material',  category:'Grains',      quantity:80,  unit:'kg',     unitPrice:45,   thresholdValue:40,  department:'kitchen', location:'Dry Store A',  createdBy:storeMgr._id },
    { name:'Cooking Oil',         itemType:'raw material',  category:'Oils',        quantity:40,  unit:'litre',  unitPrice:145,  thresholdValue:30,  department:'kitchen', location:'Dry Store B',  createdBy:storeMgr._id },
    { name:'Tomatoes',            itemType:'perishable',    category:'Vegetables',  quantity:15,  unit:'kg',     unitPrice:40,   thresholdValue:10,  department:'kitchen', location:'Cold Storage', createdBy:storeMgr._id, lastPurchased:new Date(Date.now()-1*86400000), expiryDate:new Date(Date.now()+4*86400000) },
    { name:'Onions',              itemType:'perishable',    category:'Vegetables',  quantity:25,  unit:'kg',     unitPrice:35,   thresholdValue:15,  department:'kitchen', createdBy:storeMgr._id },
    { name:'Milk (Full Cream)',   itemType:'perishable',    category:'Dairy',       quantity:50,  unit:'litre',  unitPrice:55,   thresholdValue:20,  department:'kitchen', location:'Cold Storage', createdBy:storeMgr._id, expiryDate:new Date(Date.now()+3*86400000) },
    { name:'Butter',              itemType:'perishable',    category:'Dairy',       quantity:8,   unit:'kg',     unitPrice:520,  thresholdValue:5,   department:'kitchen', location:'Cold Storage', createdBy:storeMgr._id, expiryDate:new Date(Date.now()+20*86400000) },
    { name:'Whisky (Blended)',    itemType:'liquor',        category:'Spirits',     quantity:24,  unit:'bottle', unitPrice:1200, thresholdValue:12,  department:'bar',     location:'Bar Store',    createdBy:storeMgr._id },
    { name:'Beer (500ml)',        itemType:'liquor',        category:'Beer',        quantity:120, unit:'can',    unitPrice:75,   thresholdValue:48,  department:'bar',     location:'Bar Store',    createdBy:storeMgr._id },
    { name:'Liquid Soap (5L)',    itemType:'consumable',    category:'Housekeeping',quantity:12,  unit:'can',    unitPrice:350,  thresholdValue:6,   department:'rooms',   createdBy:storeMgr._id },
    { name:'Toilet Paper (Roll)', itemType:'consumable',    category:'Housekeeping',quantity:200, unit:'pcs',    unitPrice:12,   thresholdValue:100, department:'rooms',   createdBy:storeMgr._id },
    { name:'Chlorine Tablets',    itemType:'consumable',    category:'Housekeeping',quantity:3,   unit:'kg',     unitPrice:280,  thresholdValue:5,   department:'maintenance', createdBy:storeMgr._id, expiryDate:new Date(Date.now()+45*86400000) },
    { name:'Diesel (for Generator)',itemType:'fuel',        category:'Fuel',        quantity:200, unit:'litre',  unitPrice:90,   thresholdValue:100, department:'maintenance', location:'Fuel Store', createdBy:storeMgr._id },
    { name:'Badminton Shuttles',  itemType:'equipment',     category:'Sports',      quantity:20,  unit:'pcs',    unitPrice:60,   thresholdValue:10,  department:'sports',  createdBy:storeMgr._id },
  ]);
  console.log('Store items seeded');

  console.log('\n✅ Seed complete!');
  console.log('\nLogin credentials (all use: Admin@123):');
  console.log('--- Management ---');
  console.log('  chairman@club.com          — Chairman');
  console.log('  secretary@club.com         — Secretary');
  console.log('  gm@club.com                — General Manager');
  console.log('  agm@club.com               — Asst. General Manager (AGM)');
  console.log('--- Directors ---');
  console.log('  director.food@club.com     — Director, Food & Beverage Committee');
  console.log('  director.sports@club.com   — Director, Sports Committee');
  console.log('  director.rooms@club.com    — Director, Rooms & Banquets Committee');
  console.log('  director.general@club.com  — Director, General Committee');
  console.log('--- Operations ---');
  console.log('  procurement@club.com       — Procurement Manager');
  console.log('  procasst@club.com          — Procurement Assistant');
  console.log('  store@club.com             — Store Manager');
  console.log('  storeasst@club.com         — Store Assistant');
  console.log('  kitchen@club.com           — Kitchen Manager');
  console.log('  foodctrl@club.com          — Food Control');
  console.log('  accounts@club.com          — Accounts Manager');
  console.log('  hr@club.com                — HR Manager');
  console.log('  banquet@club.com           — Banquet Manager');
  console.log('  rooms@club.com             — Rooms Manager');
  console.log('  bar@club.com               — Bar Manager');
  console.log('  sports@club.com            — Sports Manager');
  console.log('  maintenance@club.com       — Maintenance Manager');
  process.exit(0);
}

seed().catch(e => { console.error('Seed error:', e); process.exit(1); });
