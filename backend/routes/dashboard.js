const router   = require('express').Router();
const Director = require('../models/Director');
const PO       = require('../models/PurchaseOrder');
const PReq     = require('../models/ProcurementRequest');
const { Item } = require('../models/StoreModels');
const { Sale, Expense } = require('../models/Finance');
const BanquetBooking    = require('../models/BanquetBooking');
const { Room, RoomBooking } = require('../models/RoomModels');
const { Vendor }        = require('../models/Vendor');
const User              = require('../models/User');
const { protect }       = require('../middleware/auth');

async function getMonthly() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  thirtyDaysAgo.setHours(0,0,0,0);

  const [sales, expenses] = await Promise.all([
    Sale.aggregate([
      {$match: {date: {$gte: thirtyDaysAgo}}},
      {$group: {
        _id: {$dateToString: {format: "%Y-%m-%d", date: "$date"}},
        t: {$sum: '$amount'}
      }}
    ]),
    Expense.aggregate([
      {$match: {date: {$gte: thirtyDaysAgo}}},
      {$group: {
        _id: {$dateToString: {format: "%Y-%m-%d", date: "$date"}},
        t: {$sum: '$amount'}
      }}
    ])
  ]);

  const salesMap = sales.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.t }), {});
  const expenseMap = expenses.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.t }), {});

  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const s = salesMap[dateStr] || 0;
    const e = expenseMap[dateStr] || 0;
    days.push({ 
      month: d.toLocaleDateString('default', {month:'short', day:'numeric'}),
      sales: s, 
      expenses: e, 
      profit: s - e 
    });
  }
  return days;
}
async function getPnL() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  thirtyDaysAgo.setHours(0,0,0,0);

  const [sA,eA] = await Promise.all([
    Sale.aggregate([{$match: {date: {$gte: thirtyDaysAgo}}},{$group:{_id:'$department',s:{$sum:'$amount'}}}]),
    Expense.aggregate([{$match: {date: {$gte: thirtyDaysAgo}}},{$group:{_id:'$department',e:{$sum:'$amount'}}}]),
  ]);
  const depts = [...new Set([...sA.map(x=>x._id),...eA.map(x=>x._id)])];
  return depts.map(d=>({ department:d, sales:sA.find(x=>x._id===d)?.s||0, expenses:eA.find(x=>x._id===d)?.e||0, profit:(sA.find(x=>x._id===d)?.s||0)-(eA.find(x=>x._id===d)?.e||0) }));
}
async function getStoreSummary() {
  const all = await Item.find({isActive:true});
  return { total:all.length, adequate:all.filter(i=>i.stockStatus==='adequate').length, low:all.filter(i=>i.stockStatus==='low').length, critical:all.filter(i=>i.stockStatus==='critical').length, outOfStock:all.filter(i=>i.stockStatus==='out_of_stock').length, expiringSoon:all.filter(i=>{if(!i.expiryDate)return false;const d=(new Date(i.expiryDate)-Date.now())/86400000;return d>0&&d<=50;}).length, totalValue:all.reduce((s,i)=>s+i.quantity*i.unitPrice,0) };
}

router.get('/chairman', protect, async (req, res) => {
  try {
    const [directors,monthly,pnl,storeSummary,pendingReqs,pendingPOs] = await Promise.all([Director.find().populate('createdBy','name'),getMonthly(),getPnL(),getStoreSummary(),PReq.countDocuments({status:'pending'}),PO.countDocuments({orderStatus:{$in:['draft','approved']}}),]);
    res.json({ directors, monthly, pnl, storeSummary, pendingReqs, pendingPOs });
  } catch (e) { res.status(500).json({message:e.message}); }
});

router.get('/gm', protect, async (req, res) => {
  try {
    const [monthly,pnl,storeSummary,pendingReqs,pendingPOs,recentPOs] = await Promise.all([getMonthly(),getPnL(),getStoreSummary(),PReq.countDocuments({status:'pending'}),PO.countDocuments({orderStatus:{$in:['draft','approved','dispatched']}}),PO.find().sort('-createdAt').limit(8).populate('vendor','name shopName').populate('createdBy','name').populate('approvedBy','name'),]);
    res.json({ monthly, pnl, storeSummary, pendingReqs, pendingPOs, recentPOs });
  } catch (e) { res.status(500).json({message:e.message}); }
});

router.get('/procurement', protect, async (req, res) => {
  try {
    const [pending,approved,po_raised,vendorCount,grcPending,recentReqs,recentPOs] = await Promise.all([PReq.countDocuments({status:'pending'}),PReq.countDocuments({status:'approved'}),PReq.countDocuments({status:'po_raised'}),Vendor.countDocuments({isActive:true}),require('../models/StoreModels').GRC.countDocuments({status:'pending'}),PReq.find().sort('-createdAt').limit(8).populate('requestedBy','name department role').populate('approvedBy','name role').populate('rejectedBy','name role'),PO.find().sort('-createdAt').limit(8).populate('vendor','name shopName').populate('createdBy','name role').populate('approvedBy','name role').populate('paymentUpdatedBy','name role'),]);
    res.json({ stats:{pending,approved,po_raised,vendorCount,grcPending}, recentReqs, recentPOs });
  } catch (e) { res.status(500).json({message:e.message}); }
});

router.get('/store', protect, async (req, res) => {
  try {
    const [summary,lowItems,expiringItems,recentRequests] = await Promise.all([getStoreSummary(),Item.find({isActive:true}).then(items=>items.filter(i=>['low','critical','out_of_stock'].includes(i.stockStatus)).sort((a,b)=>a.quantity-b.quantity).slice(0,10)),Item.find({isActive:true,expiryDate:{$lte:new Date(Date.now()+50*86400000),$gte:new Date()}}).sort('expiryDate').limit(10),require('../models/StoreModels').InternalRequest.find().sort('-createdAt').limit(8).populate('requestedBy','name department role').populate('approvedBy','name role').populate('issuedBy','name role'),]);
    res.json({ summary, lowItems, expiringItems, recentRequests });
  } catch (e) { res.status(500).json({message:e.message}); }
});

router.get('/kitchen', protect, async (req, res) => {
  try {
    const [total,pending,approved,recentReqs] = await Promise.all([PReq.countDocuments({department:'kitchen'}),PReq.countDocuments({department:'kitchen',status:'pending'}),PReq.countDocuments({department:'kitchen',status:'approved'}),PReq.find({department:'kitchen'}).sort('-createdAt').limit(8).populate('requestedBy','name').populate('approvedBy','name role'),]);
    const from=new Date(Date.now()-30*86400000); const reqs=await PReq.find({department:'kitchen',status:{$in:['approved','po_raised','completed']},createdAt:{$gte:from}});
    const catMap={}; reqs.forEach(r=>r.items.forEach(i=>{const c=i.category||'Uncategorized';if(!catMap[c])catMap[c]={category:c,value:0};catMap[c].value+=i.quantity*(i.estimatedPrice||0);}));
    res.json({ stats:{total,pending,approved}, recentReqs, utilization:Object.values(catMap).sort((a,b)=>b.value-a.value).slice(0,6) });
  } catch (e) { res.status(500).json({message:e.message}); }
});

router.get('/banquet', protect, async (req, res) => {
  try {
    const now=new Date(); const from=new Date(now.getFullYear(),now.getMonth(),1); const to=new Date(now.getFullYear(),now.getMonth()+1,0);
    const [allMonth,upcoming,pendingPay] = await Promise.all([BanquetBooking.find({bookingDate:{$gte:from,$lte:to},status:{$ne:'cancelled'}}),BanquetBooking.find({bookingDate:{$gte:new Date(),$lte:new Date(Date.now()+7*86400000)},status:'confirmed'}).sort('bookingDate').limit(6).populate('createdBy','name'),BanquetBooking.find({paymentStatus:{$in:['due','partial']},status:{$ne:'cancelled'}}).sort('bookingDate').limit(10),]);
    const bySlot={morning:0,afternoon:0,evening:0}; allMonth.forEach(b=>{if(bySlot[b.slot]!==undefined)bySlot[b.slot]++;});
    res.json({totalEvents:allMonth.length,revenue:allMonth.reduce((s,b)=>s+(b.totalAmount||0),0),bySlot,upcoming,pendingPayments:pendingPay});
  } catch (e) { res.status(500).json({message:e.message}); }
});

router.get('/rooms', protect, async (req, res) => {
  try {
    const now=new Date(); const today=new Date(now.getFullYear(),now.getMonth(),now.getDate(),0,0,0); const todayE=new Date(now.getFullYear(),now.getMonth(),now.getDate(),23,59,59);
    const [totalRooms,occupiedRooms,availableRooms,monthBookings,checkInsToday,checkOutsToday,recentBookings] = await Promise.all([Room.countDocuments(),Room.countDocuments({status:'occupied'}),Room.countDocuments({status:'available'}),RoomBooking.countDocuments({createdAt:{$gte:new Date(now.getFullYear(),now.getMonth(),1)},status:{$ne:'cancelled'}}),RoomBooking.find({checkIn:{$gte:today,$lte:todayE},status:{$in:['confirmed','checked_in']}}).populate('room','roomNumber roomType'),RoomBooking.find({checkOut:{$gte:today,$lte:todayE},status:'checked_in'}).populate('room','roomNumber roomType'),RoomBooking.find().sort('-createdAt').limit(8).populate('room','roomNumber roomType').populate('createdBy','name').populate('checkedInBy','name').populate('checkedOutBy','name'),]);
    res.json({totalRooms,occupiedRooms,availableRooms,occupancyRate:totalRooms?Math.round((occupiedRooms/totalRooms)*100):0,monthBookings,checkInsToday:checkInsToday.length,checkOutsToday:checkOutsToday.length,checkInsList:checkInsToday,checkOutsList:checkOutsToday,recentBookings});
  } catch (e) { res.status(500).json({message:e.message}); }
});

router.get('/accounts', protect, async (req, res) => {
  try {
    const [monthly,pnl,pendingPaymentsPO] = await Promise.all([getMonthly(),getPnL(),PO.find({paymentStatus:{$in:['pending','advance']}}).populate('vendor','name').sort('-createdAt').limit(10),]);
    res.json({ monthly, pnl, pendingPaymentsPO });
  } catch (e) { res.status(500).json({message:e.message}); }
});

router.get('/hr', protect, async (req, res) => {
  try {
    const [total,active,inactive,byDept,recentStaff] = await Promise.all([User.countDocuments(),User.countDocuments({isActive:true}),User.countDocuments({isActive:false}),User.aggregate([{$group:{_id:'$department',count:{$sum:1}}}]),User.find().select('-password').sort('-createdAt').limit(8),]);
    res.json({ stats:{total,active,inactive}, byDept, recentStaff });
  } catch (e) { res.status(500).json({message:e.message}); }
});

router.get('/department/:dept', protect, async (req, res) => {
  try {
    const dept=req.params.dept; const now=new Date(); const from=new Date(now.getFullYear(),now.getMonth(),1);
    const [[s],[e],reqs,items,monthly] = await Promise.all([Sale.aggregate([{$match:{department:dept,date:{$gte:from}}},{$group:{_id:null,t:{$sum:'$amount'}}}]),Expense.aggregate([{$match:{department:dept,date:{$gte:from}}},{$group:{_id:null,t:{$sum:'$amount'}}}]),PReq.find({department:dept}).sort('-createdAt').limit(5).populate('requestedBy','name').populate('approvedBy','name role'),Item.find({department:dept,isActive:true}).sort('quantity').limit(10),(async()=>{const ms=[];const thirtyDaysAgo=new Date();thirtyDaysAgo.setDate(thirtyDaysAgo.getDate()-29);thirtyDaysAgo.setHours(0,0,0,0);const[sales,expenses]=await Promise.all([Sale.aggregate([{$match:{department:dept,date:{$gte:thirtyDaysAgo}}},{$group:{_id:{$dateToString:{format:"%Y-%m-%d",date:"$date"}},t:{$sum:'$amount'}}}]),Expense.aggregate([{$match:{department:dept,date:{$gte:thirtyDaysAgo}}},{$group:{_id:{$dateToString:{format:"%Y-%m-%d",date:"$date"}},t:{$sum:'$amount'}}}])]);const salesMap=sales.reduce((acc,curr)=>({...acc,[curr._id]:curr.t}),{});const expenseMap=expenses.reduce((acc,curr)=>({...acc,[curr._id]:curr.t}),{});for(let i=29;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const dateStr=d.toISOString().split('T')[0];const sv=salesMap[dateStr]||0;const ev=expenseMap[dateStr]||0;ms.push({month:d.toLocaleDateString('default',{month:'short',day:'numeric'}),sales:sv,expenses:ev,profit:sv-ev});}return ms;})(),]);
    res.json({ monthlySales:s?.t||0, monthlyExpenses:e?.t||0, monthlyProfit:(s?.t||0)-(e?.t||0), recentRequests:reqs, items, monthly });
  } catch (e) { res.status(500).json({message:e.message}); }
});

module.exports = router;
