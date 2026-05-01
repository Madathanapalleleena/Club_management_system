const mongoose = require('mongoose');
const { Item, StockTxn, InternalRequest, GRC } = require('./models/StoreModels');
const PO = require('./models/PurchaseOrder');
const PReq = require('./models/ProcurementRequest');
require('dotenv').config({ path: './.env' });

async function mergeDuplicates() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cms');
  console.log('Connected to DB');

  const items = await Item.find({ isActive: true });
  const map = {};
  
  for (const item of items) {
    const key = item.name.trim().toLowerCase();
    if (!map[key]) {
      map[key] = [item];
    } else {
      map[key].push(item);
    }
  }

  for (const [key, group] of Object.entries(map)) {
    if (group.length > 1) {
      console.log(`Found duplicates for ${key}: ${group.length} items`);
      // Keep the first one (or the one with the most quantity/data)
      const primary = group[0];
      let addedQty = 0;

      for (let i = 1; i < group.length; i++) {
        const dup = group[i];
        console.log(`Merging ${dup._id} into ${primary._id}`);
        
        // Add quantity
        addedQty += dup.quantity || 0;

        // Update StockTxn
        await StockTxn.updateMany({ item: dup._id }, { item: primary._id });

        // Update GRC items array (inside GRC docs)
        await GRC.updateMany(
          { 'items.itemId': dup._id },
          { $set: { 'items.$[elem].itemId': primary._id } },
          { arrayFilters: [{ 'elem.itemId': dup._id }] }
        );

        // Update InternalRequest items array
        await InternalRequest.updateMany(
          { 'items.itemId': dup._id },
          { $set: { 'items.$[elem].itemId': primary._id } },
          { arrayFilters: [{ 'elem.itemId': dup._id }] }
        );
        
        await InternalRequest.updateMany(
          { 'returnedItems.itemId': dup._id },
          { $set: { 'returnedItems.$[elem].itemId': primary._id } },
          { arrayFilters: [{ 'elem.itemId': dup._id }] }
        );

        // Mark duplicate as inactive
        dup.isActive = false;
        dup.quantity = 0;
        dup.name = dup.name + ' (Duplicate Merged)';
        await dup.save();
      }

      if (addedQty > 0) {
        primary.quantity += addedQty;
        await primary.save();
      }
    }
  }

  console.log('Duplicate merging complete.');
  process.exit(0);
}

mergeDuplicates().catch(err => {
  console.error(err);
  process.exit(1);
});
