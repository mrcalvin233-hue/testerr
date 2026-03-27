const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.use(requireAuth, requireAdmin);

router.get('/', async (req, res) => {
  const { data: profiles } = await req.supabaseAdmin.from('profiles').select('id, name, created_at, role, status');
  const { data: transactions } = await req.supabaseAdmin.from('transactions').select('amount, type, user_id');
  
  let totalIncome = 0;
  let totalExpense = 0;
  const userActivity = {};
  
  (transactions||[]).forEach(t => {
    if (t.type === 'income') totalIncome += parseFloat(t.amount);
    if (t.type === 'expense') totalExpense += parseFloat(t.amount);
    
    // Track count of transactions per user
    userActivity[t.user_id] = (userActivity[t.user_id] || 0) + 1;
  });

  // Calculate User Growth (last 6 months)
  const growthMap = {};
  (profiles||[]).forEach(p => {
    const month = new Date(p.created_at).toISOString().slice(0, 7);
    growthMap[month] = (growthMap[month] || 0) + 1;
  });
  
  const growthLabels = Object.keys(growthMap).sort().slice(-6);
  const growthValues = growthLabels.map(l => growthMap[l]);

  // Aggregate Top Users (by activity count)
  const topUsersData = (profiles||[])
    .map(p => ({ 
      name: p.name, 
      count: userActivity[p.id] || 0 
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  res.render('admin', { 
    profiles: profiles || [], 
    totalIncome, 
    totalExpense,
    growthLabels,
    growthValues,
    topUsersData
  });
});

router.post('/user/:id/password', async (req, res) => {
  const { newPassword } = req.body;
  if (!req.supabaseAdmin.auth.admin) {
      return res.status(500).send("Service Role Key is required for admin tasks.");
  }
  await req.supabaseAdmin.auth.admin.updateUserById(req.params.id, { password: newPassword });
  res.redirect('/admin');
});

router.post('/user/:id/delete', async (req, res) => {
  if (!req.supabaseAdmin.auth.admin) {
      return res.status(500).send("Service Role Key is required for admin tasks.");
  }
  await req.supabaseAdmin.auth.admin.deleteUser(req.params.id);
  res.redirect('/admin');
});

router.post('/user/:id/status', async (req, res) => {
  const { status } = req.body;
  await req.supabaseAdmin.from('profiles').update({ status }).eq('id', req.params.id);
  res.redirect('/admin');
});

module.exports = router;
